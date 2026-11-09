package br.com.factoryhub.backend.application.port;

import java.util.Map;

public interface ModelTrainingPort {
    Map<String, Object> startTraining(String dataOrigin);

    Map<String, Object> trainingStatus();

    Map<String, Object> trainingDataInfo();
}
