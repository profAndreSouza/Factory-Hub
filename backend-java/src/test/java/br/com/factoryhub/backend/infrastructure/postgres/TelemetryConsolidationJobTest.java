package br.com.factoryhub.backend.infrastructure.postgres;

import br.com.factoryhub.backend.api.dto.TelemetryConsolidationResponse;
import br.com.factoryhub.backend.api.dto.TelemetryResponse;
import br.com.factoryhub.backend.application.port.TelemetryConsolidationRepository;
import br.com.factoryhub.backend.application.port.TelemetryDataPort;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TelemetryConsolidationJobTest {
    @Test
    void resumesEveryCompletedWindowAfterThePersistedCheckpoint() {
        TelemetryDataPort telemetry = mock(TelemetryDataPort.class);
        TelemetryConsolidationRepository repository = mock(TelemetryConsolidationRepository.class);
        Instant endLimit = floorWindow(Instant.now());
        Instant checkpoint = endLimit.minusSeconds(600);
        when(repository.findLastWindowEnd()).thenReturn(Optional.of(checkpoint));
        when(repository.findDeviceIds()).thenReturn(List.of());

        new TelemetryConsolidationJob(telemetry, repository).consolidateCompletedWindows();

        verify(repository).saveWindow(checkpoint, checkpoint.plusSeconds(300), List.of());
        verify(repository).saveWindow(checkpoint.plusSeconds(300), checkpoint.plusSeconds(600), List.of());
    }

    @Test
    void excludesCounterDeltasAcrossLargeTelemetryGaps() {
        TelemetryDataPort telemetry = mock(TelemetryDataPort.class);
        TelemetryConsolidationRepository repository = mock(TelemetryConsolidationRepository.class);
        Instant endLimit = floorWindow(Instant.now());
        Instant windowStart = endLimit.minusSeconds(300);
        when(repository.findLastWindowEnd()).thenReturn(Optional.of(windowStart));
        when(repository.findDeviceIds()).thenReturn(List.of("machine-01"));
        when(telemetry.findForPeriod(eq("machine-01"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(
                        reading(windowStart.minusSeconds(3), 0, 0),
                        reading(windowStart.plusSeconds(3), 1, 0),
                        reading(windowStart.plusSeconds(6), 2, 0),
                        reading(windowStart.plusSeconds(30), 7, 2)));

        new TelemetryConsolidationJob(telemetry, repository).consolidateCompletedWindows();

        org.mockito.ArgumentCaptor<List<TelemetryConsolidationResponse>> rows =
                org.mockito.ArgumentCaptor.forClass(List.class);
        verify(repository).saveWindow(eq(windowStart), eq(endLimit), rows.capture());
        org.junit.jupiter.api.Assertions.assertEquals(1, rows.getValue().size());
        org.junit.jupiter.api.Assertions.assertEquals(2, rows.getValue().get(0).total_pecas());
        org.junit.jupiter.api.Assertions.assertEquals(0, rows.getValue().get(0).pecas_defeito());
    }

    private static TelemetryResponse reading(Instant timestamp, int produced, int scrap) {
        return new TelemetryResponse(timestamp, 70.0, 2.0, 3000, "OPERATIONAL",
                produced, scrap, "RUNNING", "LIVE");
    }

    private static Instant floorWindow(Instant instant) {
        long epochSeconds = instant.getEpochSecond();
        return Instant.ofEpochSecond(epochSeconds - Math.floorMod(epochSeconds, 300));
    }
}
