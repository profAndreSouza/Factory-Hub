package br.com.factoryhub.backend.api.dto;

import java.time.Instant;

public record AlertResponse(
        String id,
        String device_id,
        Instant timestamp,
        double probabilidade_falha,
        String status_previsto,
        String recomendacao,
        String severidade) {
}
