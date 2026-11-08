package br.com.factoryhub.backend.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public record PredictionResponse(
        String device_id,
        String status_previsto,
        double probabilidade_falha,
        String recomendacao,
        String modelo_versao,
        @JsonProperty("timestamp_analise") Instant timestampAnalise,
        String source) {
}
