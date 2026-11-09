package br.com.factoryhub.backend.infrastructure.postgres;

import br.com.factoryhub.backend.api.dto.AlertResponse;
import br.com.factoryhub.backend.api.dto.MachineReadingResponse;
import br.com.factoryhub.backend.api.dto.MachineResponse;
import br.com.factoryhub.backend.api.dto.OeeResponse;
import br.com.factoryhub.backend.api.dto.PredictionResponse;
import br.com.factoryhub.backend.api.dto.TelemetryResponse;
import br.com.factoryhub.backend.application.port.OperationalDataPort;
import br.com.factoryhub.backend.application.port.TelemetryDataPort;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Component
@Profile("postgres")
public class PostgresOperationalDataAdapter implements OperationalDataPort {
    private static final long MAX_SAMPLE_INTERVAL_SECONDS = 9;
    private static final double IDEAL_CYCLE_SECONDS = 3.0;
    private final JdbcTemplate jdbc;
    private final TelemetryDataPort telemetry;

    public PostgresOperationalDataAdapter(JdbcTemplate jdbc, TelemetryDataPort telemetry) {
        this.jdbc = jdbc;
        this.telemetry = telemetry;
    }

    @Override
    public List<MachineResponse> findMachines() {
        List<MachineResponse> machines = jdbc.query(
                "SELECT device_id, name, machine_type FROM machines ORDER BY device_id",
                (rs, rowNum) -> new MachineResponse(
                        rs.getString("device_id"), rs.getString("name"), rs.getString("machine_type"),
                        "UNKNOWN", null));

        return machines.stream().map(machine -> {
            List<TelemetryResponse> readings = telemetry.findRecent(machine.id());
            if (readings.isEmpty()) return machine;

            TelemetryResponse latest = readings.get(readings.size() - 1);
            MachineReadingResponse reading = new MachineReadingResponse(
                    latest.temperatura(), latest.vibracao(), latest.rpm(), latest.status(),
                    latest.pecas_produzidas(), latest.pecas_defeito(), latest.timestamp());
            return new MachineResponse(machine.id(), machine.nome(), machine.tipo(), latest.status(), reading);
        }).toList();
    }

    @Override
    public Optional<OeeResponse> findOee(String deviceId, String period) {
        LocalDate date = "hoje".equalsIgnoreCase(period)
                ? LocalDate.now(ZoneOffset.UTC) : LocalDate.parse(period);
        Instant start = date.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Optional<OeeResponse> liveOee = calculateLiveOee(
                deviceId, date, telemetry.findForPeriod(deviceId, start, end));
        if (liveOee.isPresent()) return liveOee;

        return jdbc.query("""
                        SELECT device_id, period_date, availability, performance, quality, oee,
                               operating_minutes, downtime_minutes, total_parts, good_parts, scrap_parts, data_origin
                        FROM oee_snapshots
                        WHERE device_id = ? AND period_date = ?
                        """,
                (rs, rowNum) -> mapOee(rs), deviceId, date).stream().findFirst();
    }

    private static Optional<OeeResponse> calculateLiveOee(
            String deviceId, LocalDate date, List<TelemetryResponse> readings) {
        if (readings.size() < 2) return Optional.empty();

        long observedSeconds = 0;
        long operatingSeconds = 0;
        long totalParts = 0;
        long scrapParts = 0;
        boolean hasCounters = false;

        for (int index = 1; index < readings.size(); index++) {
            TelemetryResponse previous = readings.get(index - 1);
            TelemetryResponse current = readings.get(index);
            long interval = Duration.between(previous.timestamp(), current.timestamp()).getSeconds();
            if (interval <= 0 || interval > MAX_SAMPLE_INTERVAL_SECONDS) continue;

            observedSeconds += interval;
            if (isRunning(previous)) operatingSeconds += interval;

            if (previous.pecas_produzidas() != null && current.pecas_produzidas() != null
                    && previous.pecas_defeito() != null && current.pecas_defeito() != null) {
                hasCounters = true;
                totalParts += counterDelta(previous.pecas_produzidas(), current.pecas_produzidas());
                scrapParts += counterDelta(previous.pecas_defeito(), current.pecas_defeito());
            }
        }

        if (observedSeconds == 0 || !hasCounters) return Optional.empty();

        long goodParts = Math.max(0, totalParts - scrapParts);
        double availability = percentage(operatingSeconds, observedSeconds);
        double performance = operatingSeconds == 0 ? 0.0
                : Math.min(100.0, (totalParts * IDEAL_CYCLE_SECONDS / operatingSeconds) * 100.0);
        double quality = totalParts == 0 ? 100.0 : percentage(goodParts, totalParts);
        double oee = availability * performance * quality / 10000.0;

        return Optional.of(new OeeResponse(
                deviceId, date.toString(), round(availability), round(performance), round(quality), round(oee),
                (int) Math.round(operatingSeconds / 60.0),
                (int) Math.round((observedSeconds - operatingSeconds) / 60.0),
                (int) Math.min(totalParts, Integer.MAX_VALUE),
                (int) Math.min(goodParts, Integer.MAX_VALUE),
                (int) Math.min(scrapParts, Integer.MAX_VALUE),
                "LIVE_PARTIAL", (int) Math.min(observedSeconds, Integer.MAX_VALUE)));
    }

    private static boolean isRunning(TelemetryResponse reading) {
        if (reading.machine_state() != null) {
            return "RUNNING".equalsIgnoreCase(reading.machine_state());
        }
        return reading.rpm() > 0;
    }

    private static long counterDelta(int previous, int current) {
        return current >= previous ? current - previous : Math.max(0, current);
    }

    private static double percentage(long numerator, long denominator) {
        return denominator == 0 ? 0.0 : (numerator * 100.0) / denominator;
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    @Override
    public List<AlertResponse> findAlerts() {
        return jdbc.query("""
                        SELECT id, device_id, occurred_at, failure_probability, predicted_status,
                               recommendation, severity
                        FROM alerts
                        ORDER BY occurred_at DESC
                        LIMIT 100
                        """,
                (rs, rowNum) -> new AlertResponse(
                        Long.toString(rs.getLong("id")),
                        rs.getString("device_id"),
                        rs.getObject("occurred_at", OffsetDateTime.class).toInstant(),
                        rs.getDouble("failure_probability"),
                        rs.getString("predicted_status"),
                        rs.getString("recommendation"),
                        rs.getString("severity")));
    }

    @Override
    @Transactional
    public void recordPrediction(PredictionResponse prediction) {
        if ("OPERATIONAL".equalsIgnoreCase(prediction.status_previsto())) return;

        String severity = "RISCO_ANOMALIA".equalsIgnoreCase(prediction.status_previsto())
                ? "HIGH" : "MEDIUM";
        jdbc.update("""
                        INSERT INTO alerts (
                            device_id, occurred_at, failure_probability, predicted_status,
                            recommendation, severity, data_origin
                        ) VALUES (?, ?, ?, ?, ?, ?, 'MODEL')
                        """,
                prediction.device_id(), OffsetDateTime.ofInstant(prediction.timestampAnalise(), ZoneOffset.UTC),
                prediction.probabilidade_falha() * 100.0, prediction.status_previsto(),
                prediction.recomendacao(), severity);
    }

    private static OeeResponse mapOee(ResultSet rs) throws SQLException {
        return new OeeResponse(
                rs.getString("device_id"), rs.getDate("period_date").toLocalDate().toString(),
                rs.getDouble("availability"), rs.getDouble("performance"), rs.getDouble("quality"),
                rs.getDouble("oee"), rs.getInt("operating_minutes"), rs.getInt("downtime_minutes"),
                rs.getInt("total_parts"), rs.getInt("good_parts"), rs.getInt("scrap_parts"),
                rs.getString("data_origin"),
                (rs.getInt("operating_minutes") + rs.getInt("downtime_minutes")) * 60);
    }
}
