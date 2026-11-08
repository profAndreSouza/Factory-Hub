package br.com.factoryhub.backend.application.port;

import br.com.factoryhub.backend.api.dto.TelemetryResponse;

import java.util.List;

/** Time-series data boundary (planned InfluxDB source). */
public interface TelemetryDataPort {
    List<TelemetryResponse> findRecent(String deviceId);
}
