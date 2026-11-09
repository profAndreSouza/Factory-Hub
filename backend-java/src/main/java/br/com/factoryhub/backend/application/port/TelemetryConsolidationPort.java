package br.com.factoryhub.backend.application.port;

import br.com.factoryhub.backend.api.dto.TelemetryConsolidationResponse;

import java.util.List;

public interface TelemetryConsolidationPort {
    List<TelemetryConsolidationResponse> findRecent(String deviceId, int limit);
}
