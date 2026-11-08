package br.com.factoryhub.backend.api;

import br.com.factoryhub.backend.api.dto.HealthResponse;
import br.com.factoryhub.backend.api.dto.ServiceHealthResponse;
import br.com.factoryhub.backend.application.port.DependencyHealthPort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {
    private final DependencyHealthPort dependencyHealth;

    public HealthController(DependencyHealthPort dependencyHealth) {
        this.dependencyHealth = dependencyHealth;
    }

    @GetMapping
    public HealthResponse health() {
        List<ServiceHealthResponse> services = new ArrayList<>();
        services.add(new ServiceHealthResponse("Backend Java", "UP", null, "LIVE"));
        services.addAll(dependencyHealth.dependencies());
        return new HealthResponse(services);
    }
}
