package br.com.factoryhub.backend.infrastructure.health;

import br.com.factoryhub.backend.api.dto.ServiceHealthResponse;
import br.com.factoryhub.backend.application.port.DependencyHealthPort;
import com.influxdb.client.InfluxDBClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/** Reports real Flask health and clearly marked mock states for unconnected services. */
@Component
public class DependencyHealthAdapter implements DependencyHealthPort {
    private final RestClient flaskClient;
    private final ObjectProvider<InfluxDBClient> influxClient;
    private final ObjectProvider<DataSource> dataSource;

    public DependencyHealthAdapter(@Value("${factoryhub.ml.base-url}") String baseUrl,
                                   ObjectProvider<InfluxDBClient> influxClient,
                                   ObjectProvider<DataSource> dataSource) {
        this.flaskClient = RestClient.builder().baseUrl(baseUrl).build();
        this.influxClient = influxClient;
        this.dataSource = dataSource;
    }

    @Override
    public List<ServiceHealthResponse> dependencies() {
        List<ServiceHealthResponse> services = new ArrayList<>();
        services.add(flaskHealth());
        services.add(new ServiceHealthResponse("MQTT Broker", "UP", null, "MOCK"));
        services.add(influxHealth());
        services.add(rdsHealth());
        return services;
    }

    private ServiceHealthResponse rdsHealth() {
        DataSource client = dataSource.getIfAvailable();
        if (client == null) return new ServiceHealthResponse("RDS PostgreSQL", "UP", null, "MOCK");
        long startedAt = System.nanoTime();
        try (Connection connection = client.getConnection(); Statement statement = connection.createStatement()) {
            statement.execute("SELECT 1");
            long latencyMs = (System.nanoTime() - startedAt) / 1_000_000;
            return new ServiceHealthResponse("RDS PostgreSQL", "UP",
                    Math.toIntExact(Math.min(latencyMs, Integer.MAX_VALUE)), "LIVE");
        } catch (Exception exception) {
            return new ServiceHealthResponse("RDS PostgreSQL", "DOWN", null, "LIVE");
        }
    }

    private ServiceHealthResponse influxHealth() {
        InfluxDBClient client = influxClient.getIfAvailable();
        if (client == null) return new ServiceHealthResponse("InfluxDB", "UP", null, "MOCK");
        long startedAt = System.nanoTime();
        try {
            boolean ready = client.ping();
            long latencyMs = (System.nanoTime() - startedAt) / 1_000_000;
            return new ServiceHealthResponse("InfluxDB", ready ? "UP" : "DOWN",
                    Math.toIntExact(Math.min(latencyMs, Integer.MAX_VALUE)), "LIVE");
        } catch (RuntimeException exception) {
            return new ServiceHealthResponse("InfluxDB", "DOWN", null, "LIVE");
        }
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
