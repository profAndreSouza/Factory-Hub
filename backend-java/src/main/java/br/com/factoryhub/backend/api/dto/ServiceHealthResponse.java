package br.com.factoryhub.backend.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ServiceHealthResponse(
        String name,
        String status,
        @JsonProperty("latency_ms") Integer latencyMs,
        String source) {
}
