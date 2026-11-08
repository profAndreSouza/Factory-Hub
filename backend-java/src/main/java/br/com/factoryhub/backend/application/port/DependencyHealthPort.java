package br.com.factoryhub.backend.application.port;

import br.com.factoryhub.backend.api.dto.ServiceHealthResponse;

import java.util.List;

/** Health checks for dependent services; the mock adapter is explicit about its source. */
public interface DependencyHealthPort {
    List<ServiceHealthResponse> dependencies();
}
