package br.com.factoryhub.backend.api;

import br.com.factoryhub.backend.application.port.ModelTrainingPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/treinamentos")
public class ModelTrainingController {
    private final ModelTrainingPort modelTraining;

    public ModelTrainingController(ModelTrainingPort modelTraining) {
        this.modelTraining = modelTraining;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> startTraining(
            @RequestParam(name = "data_origin", defaultValue = "ALL") String dataOrigin) {
        String normalizedOrigin = dataOrigin.toUpperCase(Locale.ROOT);
        if (!Set.of("ALL", "DEMO", "LIVE").contains(normalizedOrigin)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "data_origin deve ser ALL, DEMO ou LIVE.");
        }
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(modelTraining.startTraining(normalizedOrigin));
    }

    @GetMapping("/status")
    public Map<String, Object> trainingStatus() {
        return modelTraining.trainingStatus();
    }

    @GetMapping("/data-info")
    public Map<String, Object> trainingDataInfo() {
        return modelTraining.trainingDataInfo();
    }
}
