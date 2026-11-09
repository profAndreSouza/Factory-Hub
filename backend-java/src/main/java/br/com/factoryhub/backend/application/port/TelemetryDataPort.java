package br.com.factoryhub.backend.application.port;

import br.com.factoryhub.backend.api.dto.TelemetryResponse;

import java.time.Instant;
import java.util.List;

/** Time-series data boundary for recent and period-scoped telemetry queries. */
public interface TelemetryDataPort {
    List<TelemetryResponse> findRecent(String deviceId);

    default List<TelemetryResponse> findForPeriod(String deviceId, Instant start, Instant end) {
        return List.of();
    }
}
