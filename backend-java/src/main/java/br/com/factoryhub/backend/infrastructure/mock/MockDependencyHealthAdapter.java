package br.com.factoryhub.backend.infrastructure.mock;

import br.com.factoryhub.backend.api.dto.ServiceHealthResponse;
import br.com.factoryhub.backend.application.port.DependencyHealthPort;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

/** Placeholder health results until active checks to each dependency are implemented. */
@Component
@Profile("mock")
public class MockDependencyHealthAdapter implements DependencyHealthPort {
    @Override
    public List<ServiceHealthResponse> dependencies() {
        return List.of(
                new ServiceHealthResponse("MQTT Broker", "UP", null, "MOCK"),
                new ServiceHealthResponse("Flask AI", "DEGRADED", null, "MOCK"),
                new ServiceHealthResponse("InfluxDB", "UP", null, "MOCK"),
                new ServiceHealthResponse("RDS PostgreSQL", "UP", null, "MOCK"));
    }
}
