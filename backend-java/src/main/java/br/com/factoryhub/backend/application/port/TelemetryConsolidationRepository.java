package br.com.factoryhub.backend.application.port;

import br.com.factoryhub.backend.api.dto.TelemetryConsolidationResponse;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TelemetryConsolidationRepository extends TelemetryConsolidationPort {
    List<String> findDeviceIds();

    Optional<Instant> findLastWindowEnd();

    void saveWindow(Instant windowStart, Instant windowEnd,
                    List<TelemetryConsolidationResponse> consolidations);
}
