package br.com.factoryhub.backend.infrastructure.postgres;

import br.com.factoryhub.backend.api.dto.TelemetryConsolidationResponse;
import br.com.factoryhub.backend.api.dto.TelemetryResponse;
import br.com.factoryhub.backend.application.port.TelemetryConsolidationRepository;
import br.com.factoryhub.backend.application.port.TelemetryDataPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@Profile("postgres & influx")
public class TelemetryConsolidationJob {
    private static final Logger log = LoggerFactory.getLogger(TelemetryConsolidationJob.class);
    private static final Duration WINDOW = Duration.ofMinutes(5);
    private static final long MAX_COUNTER_GAP_SECONDS = 9;

    private final TelemetryDataPort telemetry;
    private final TelemetryConsolidationRepository consolidations;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public TelemetryConsolidationJob(TelemetryDataPort telemetry,
                                    TelemetryConsolidationRepository consolidations) {
        this.telemetry = telemetry;
        this.consolidations = consolidations;
    }

    @Scheduled(cron = "${factoryhub.consolidation.cron:0 */5 * * * *}", zone = "UTC")
    public void consolidateCompletedWindows() {
        if (!running.compareAndSet(false, true)) return;
        try {
            Instant endLimit = floorWindow(Instant.now());
            Instant windowStart = consolidations.findLastWindowEnd()
                    .orElse(endLimit.minus(WINDOW));
            List<String> deviceIds = consolidations.findDeviceIds();
            while (windowStart.isBefore(endLimit)) {
                Instant windowEnd = windowStart.plus(WINDOW);
                List<TelemetryConsolidationResponse> rows = new ArrayList<>();
                for (String deviceId : deviceIds) {
                    List<TelemetryResponse> readings = telemetry.findForPeriod(
                            deviceId, windowStart.minusSeconds(MAX_COUNTER_GAP_SECONDS), windowEnd);
                    summarize(deviceId, windowStart, windowEnd, readings).ifPresent(rows::add);
                }
                consolidations.saveWindow(windowStart, windowEnd, rows);
                log.info("Consolidated telemetry window {}..{} for {} machines; {} rows saved",
                        windowStart, windowEnd, deviceIds.size(), rows.size());
                windowStart = windowEnd;
            }
        } catch (RuntimeException exception) {
            log.error("Telemetry consolidation failed; the unfinished window will be retried", exception);
        } finally {
            running.set(false);
        }
    }

    private static java.util.Optional<TelemetryConsolidationResponse> summarize(
            String deviceId, Instant windowStart, Instant windowEnd, List<TelemetryResponse> source) {
        List<TelemetryResponse> readings = source.stream()
                .sorted(Comparator.comparing(TelemetryResponse::timestamp))
                .toList();
        List<TelemetryResponse> inWindow = readings.stream()
                .filter(reading -> !reading.timestamp().isBefore(windowStart)
                        && reading.timestamp().isBefore(windowEnd))
                .toList();
        if (inWindow.isEmpty()) return java.util.Optional.empty();

        double avgTemperature = inWindow.stream().mapToDouble(TelemetryResponse::temperatura).average().orElse(0);
        double avgVibration = inWindow.stream().mapToDouble(TelemetryResponse::vibracao).average().orElse(0);
        double avgRpm = inWindow.stream().mapToInt(TelemetryResponse::rpm).average().orElse(0);
        int totalParts = 0;
        int scrapParts = 0;
        for (int index = 1; index < readings.size(); index++) {
            TelemetryResponse previous = readings.get(index - 1);
            TelemetryResponse current = readings.get(index);
            long interval = Duration.between(previous.timestamp(), current.timestamp()).getSeconds();
            boolean currentInWindow = !current.timestamp().isBefore(windowStart)
                    && current.timestamp().isBefore(windowEnd);
            if (!currentInWindow || interval <= 0 || interval > MAX_COUNTER_GAP_SECONDS) continue;
            if (previous.pecas_produzidas() != null && current.pecas_produzidas() != null) {
                totalParts += counterDelta(previous.pecas_produzidas(), current.pecas_produzidas());
            }
            if (previous.pecas_defeito() != null && current.pecas_defeito() != null) {
                scrapParts += counterDelta(previous.pecas_defeito(), current.pecas_defeito());
            }
        }

        String status = summarizeStatus(inWindow);
        return java.util.Optional.of(new TelemetryConsolidationResponse(
                deviceId, windowStart, windowEnd, inWindow.size(),
                avgTemperature, inWindow.stream().mapToDouble(TelemetryResponse::temperatura).min().orElse(0),
                inWindow.stream().mapToDouble(TelemetryResponse::temperatura).max().orElse(0),
                avgVibration, inWindow.stream().mapToDouble(TelemetryResponse::vibracao).min().orElse(0),
                inWindow.stream().mapToDouble(TelemetryResponse::vibracao).max().orElse(0),
                avgRpm, totalParts, scrapParts, status, "LIVE", Instant.now()));
    }

    private static String summarizeStatus(List<TelemetryResponse> readings) {
        if (readings.stream().anyMatch(reading -> "CRITICAL".equalsIgnoreCase(reading.status()))) return "CRITICAL";
        if (readings.stream().anyMatch(reading -> "WARNING".equalsIgnoreCase(reading.status()))) return "WARNING";
        boolean allStopped = readings.stream().allMatch(reading -> reading.machine_state() != null
                ? "STOPPED".equalsIgnoreCase(reading.machine_state()) : reading.rpm() == 0);
        return allStopped ? "STOPPED" : "OPERATIONAL";
    }

    private static int counterDelta(int previous, int current) {
        return current >= previous ? current - previous : Math.max(0, current);
    }

    private static Instant floorWindow(Instant instant) {
        long epochSeconds = instant.getEpochSecond();
        long windowSeconds = WINDOW.toSeconds();
        return Instant.ofEpochSecond(epochSeconds - Math.floorMod(epochSeconds, windowSeconds));
    }
}
