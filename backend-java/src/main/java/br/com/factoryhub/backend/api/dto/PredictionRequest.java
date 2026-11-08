package br.com.factoryhub.backend.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

public record PredictionRequest(
        @NotBlank String device_id,
        @DecimalMin("0.0") @DecimalMax("150.0") double temperatura,
        @DecimalMin("0.0") @DecimalMax("50.0") double vibracao,
        @DecimalMin("0.0") @DecimalMax("10000.0") double rpm) {
}
