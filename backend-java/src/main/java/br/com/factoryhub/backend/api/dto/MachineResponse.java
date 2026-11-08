package br.com.factoryhub.backend.api.dto;

public record MachineResponse(
        String id,
        String nome,
        String tipo,
        String status_atual,
        MachineReadingResponse ultima_leitura) {
}
