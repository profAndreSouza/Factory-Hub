package br.com.factoryhub.backend.infrastructure.mock;

import br.com.factoryhub.backend.api.dto.PredictionRequest;
import br.com.factoryhub.backend.api.dto.PredictionResponse;
import br.com.factoryhub.backend.application.port.PredictionPort;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Optional no-network prediction adapter for explicitly offline runs. */
@Component
@Profile("offline")
public class MockPredictionAdapter implements PredictionPort {
    @Override
    public PredictionResponse predict(PredictionRequest request) {
        boolean critical = request.temperatura() >= 90 || request.vibracao() >= 7;
        boolean attention = request.temperatura() >= 80 || request.vibracao() >= 4.5;

        if (critical) {
            return new PredictionResponse(request.device_id(), "RISCO_ANOMALIA", 0.91,
                    "Condição fora da faixa de operação. Reduzir carga e inspecionar a máquina antes de continuar.",
                    "mock-random-forest-v1", Instant.now(), "MOCK");
        }
        if (attention) {
            return new PredictionResponse(request.device_id(), "ATENCAO", 0.58,
                    "Parâmetros em elevação. Monitorar continuamente e programar inspeção preventiva.",
                    "mock-random-forest-v1", Instant.now(), "MOCK");
        }
        return new PredictionResponse(request.device_id(), "OPERATIONAL", 0.08,
                "Parâmetros dentro da faixa de referência. Manter o plano de manutenção vigente.",
                "mock-random-forest-v1", Instant.now(), "MOCK");
    }
}
