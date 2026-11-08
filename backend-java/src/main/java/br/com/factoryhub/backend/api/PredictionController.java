package br.com.factoryhub.backend.api;

import br.com.factoryhub.backend.api.dto.PredictionRequest;
import br.com.factoryhub.backend.api.dto.PredictionResponse;
import br.com.factoryhub.backend.application.port.PredictionPort;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/predicoes")
public class PredictionController {
    private final PredictionPort predictionPort;

    public PredictionController(PredictionPort predictionPort) {
        this.predictionPort = predictionPort;
    }

    @PostMapping
    public PredictionResponse predict(@Valid @RequestBody PredictionRequest request) {
        return predictionPort.predict(request);
    }
}
