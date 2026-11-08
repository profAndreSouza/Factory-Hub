package br.com.factoryhub.backend.infrastructure.flask;

import br.com.factoryhub.backend.api.dto.PredictionRequest;
import br.com.factoryhub.backend.api.dto.PredictionResponse;
import br.com.factoryhub.backend.application.port.PredictionPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

/** Calls the private Flask service; the React browser never sees its network address. */
@Component
public class FlaskPredictionAdapter implements PredictionPort {
    private final RestClient flaskClient;

    public FlaskPredictionAdapter(@Value("${factoryhub.ml.base-url}") String baseUrl) {
        this.flaskClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    @Override
    public PredictionResponse predict(PredictionRequest request) {
        try {
            PredictionResponse response = flaskClient.post()
                    .uri("/predict")
                    .body(request)
                    .retrieve()
                    .body(PredictionResponse.class);
            if (response == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "O serviço Flask retornou uma resposta vazia.");
            }
            return response;
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Não foi possível consultar o serviço Flask.", exception);
        }
    }
}
