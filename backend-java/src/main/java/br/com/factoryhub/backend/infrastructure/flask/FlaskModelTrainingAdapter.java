package br.com.factoryhub.backend.infrastructure.flask;

import br.com.factoryhub.backend.application.port.ModelTrainingPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Component
public class FlaskModelTrainingAdapter implements ModelTrainingPort {
    private static final ParameterizedTypeReference<Map<String, Object>> RESPONSE_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestClient flaskClient;

    public FlaskModelTrainingAdapter(@Value("${factoryhub.ml.base-url}") String baseUrl) {
        this.flaskClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    @Override
    public Map<String, Object> startTraining(String dataOrigin) {
        try {
            return flaskClient.post()
                    .uri("/train")
                    .body(Map.of("data_origin", dataOrigin))
                    .retrieve().body(RESPONSE_TYPE);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Não foi possível iniciar o treinamento no serviço Flask.", exception);
        }
    }

    @Override
    public Map<String, Object> trainingStatus() {
        try {
            return flaskClient.get().uri("/training/status").retrieve().body(RESPONSE_TYPE);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Não foi possível consultar o treinamento no serviço Flask.", exception);
        }
    }

    @Override
    public Map<String, Object> trainingDataInfo() {
        try {
            return flaskClient.get().uri("/training/data-info").retrieve().body(RESPONSE_TYPE);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Nao foi possivel consultar a quantidade atual de dados para treino no Flask.", exception);
        }
    }
}
