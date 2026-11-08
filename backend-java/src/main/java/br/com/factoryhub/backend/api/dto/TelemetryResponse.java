package br.com.factoryhub.backend.api.dto;

import java.time.Instant;

public record TelemetryResponse(
        Instant timestamp,
        double temperatura,
        double vibracao,
        int rpm,
        String status,
        Integer pecas_produzidas,
        Integer pecas_defeito) {
}
