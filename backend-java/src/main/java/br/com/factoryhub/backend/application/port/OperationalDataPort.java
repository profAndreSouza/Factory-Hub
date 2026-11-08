package br.com.factoryhub.backend.application.port;

import br.com.factoryhub.backend.api.dto.AlertResponse;
import br.com.factoryhub.backend.api.dto.MachineResponse;
import br.com.factoryhub.backend.api.dto.OeeResponse;
import br.com.factoryhub.backend.api.dto.PredictionResponse;

import java.util.List;
import java.util.Optional;

/** Data access boundary for machine catalog, OEE and alerts (planned RDS source). */
public interface OperationalDataPort {
    List<MachineResponse> findMachines();

    Optional<OeeResponse> findOee(String deviceId, String period);

    List<AlertResponse> findAlerts();

    default void recordPrediction(PredictionResponse prediction) {
        // Offline adapters may intentionally ignore prediction history.
    }
}
