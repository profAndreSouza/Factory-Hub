package br.com.factoryhub.backend.api.dto;

public record OeeResponse(
        String device_id,
        String periodo,
        double disponibilidade,
        double performance,
        double qualidade,
        double oee,
        int tempo_operando_minutos,
        int tempo_parado_minutos,
        int total_pecas,
        int pecas_boas,
        int pecas_refugo,
        String origem,
        int tempo_observado_segundos) {
}
