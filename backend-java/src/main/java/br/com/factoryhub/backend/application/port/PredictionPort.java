package br.com.factoryhub.backend.application.port;

import br.com.factoryhub.backend.api.dto.PredictionRequest;
import br.com.factoryhub.backend.api.dto.PredictionResponse;

/** Prediction boundary; the cloud adapter delegates to the private Flask API. */
public interface PredictionPort {
    PredictionResponse predict(PredictionRequest request);
}
