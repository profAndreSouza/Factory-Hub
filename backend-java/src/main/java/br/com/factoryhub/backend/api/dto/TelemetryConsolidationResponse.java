package br.com.factoryhub.backend.api.dto;

import java.time.Instant;

public record TelemetryConsolidationResponse(
        String device_id,
        Instant window_start,
        Instant window_end,
        int sample_count,
        double avg_temperatura,
        double min_temperatura,
        double max_temperatura,
        double avg_vibracao,
        double min_vibracao,
        double max_vibracao,
        double avg_rpm,
        int total_pecas,
        int pecas_defeito,
        String status,
        String data_origin,
        Instant created_at) {
}
