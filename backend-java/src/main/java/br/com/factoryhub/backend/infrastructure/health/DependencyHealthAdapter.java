package br.com.factoryhub.backend.infrastructure.health;

import br.com.factoryhub.backend.api.dto.ServiceHealthResponse;
import br.com.factoryhub.backend.application.port.DependencyHealthPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;

/** Reports real Flask health and clearly marked mock states for unconnected services. */
@Component
public class DependencyHealthAdapter implements DependencyHealthPort {
    private final RestClient flaskClient;

    public DependencyHealthAdapter(@Value("${factoryhub.ml.base-url}") String baseUrl) {
        this.flaskClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    @Override
    public List<ServiceHealthResponse> dependencies() {
        List<ServiceHealthResponse> services = new ArrayList<>();
        services.add(flaskHealth());
        services.add(new ServiceHealthResponse("MQTT Broker", "UP", null, "MOCK"));
        services.add(new ServiceHealthResponse("InfluxDB", "UP", null, "MOCK"));
        services.add(new ServiceHealthResponse("RDS PostgreSQL", "UP", null, "MOCK"));
        return services;
    }

    private ServiceHealthResponse flaskHealth() {
        long startedAt = System.nanoTime();
        try {
            FlaskHealthSnapshot snapshot = flaskClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(FlaskHealthSnapshot.class);
            long latencyMs = (System.nanoTime() - startedAt) / 1_000_000;
            boolean ready = snapshot != null
                    && "UP".equalsIgnoreCase(snapshot.status())
                    && Boolean.TRUE.equals(snapshot.model_loaded());
            return new ServiceHealthResponse("Flask AI", ready ? "UP" : "DEGRADED",
                    Math.toIntExact(Math.min(latencyMs, Integer.MAX_VALUE)), "LIVE");
        } catch (RestClientException exception) {
            return new ServiceHealthResponse("Flask AI", "DOWN", null, "LIVE");
        }
    }

    private record FlaskHealthSnapshot(String status, Boolean model_loaded) {
    }
}
