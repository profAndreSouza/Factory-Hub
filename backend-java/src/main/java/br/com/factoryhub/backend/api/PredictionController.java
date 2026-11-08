package br.com.factoryhub.backend.api;

import br.com.factoryhub.backend.api.dto.PredictionRequest;
import br.com.factoryhub.backend.api.dto.PredictionResponse;
import br.com.factoryhub.backend.application.port.PredictionPort;
import br.com.factoryhub.backend.application.port.OperationalDataPort;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/predicoes")
public class PredictionController {
    private final PredictionPort predictionPort;
    private final OperationalDataPort operationalData;

    public PredictionController(PredictionPort predictionPort, OperationalDataPort operationalData) {
        this.predictionPort = predictionPort;
        this.operationalData = operationalData;
    }

    @PostMapping
    public PredictionResponse predict(@Valid @RequestBody PredictionRequest request) {
        PredictionResponse prediction = predictionPort.predict(request);
        operationalData.recordPrediction(prediction);
        return prediction;
    }
}
