package br.com.factoryhub.backend.api.dto;

import java.util.List;

public record HealthResponse(List<ServiceHealthResponse> services) {
}
