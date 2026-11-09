package br.com.factoryhub.backend.api;

import br.com.factoryhub.backend.application.port.ModelTrainingPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/treinamentos")
public class ModelTrainingController {
    private final ModelTrainingPort modelTraining;

    public ModelTrainingController(ModelTrainingPort modelTraining) {
        this.modelTraining = modelTraining;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> startTraining() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(modelTraining.startTraining());
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
