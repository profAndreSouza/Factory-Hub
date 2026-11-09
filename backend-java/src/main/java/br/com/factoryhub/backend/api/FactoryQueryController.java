package br.com.factoryhub.backend.api;

import br.com.factoryhub.backend.api.dto.AlertResponse;
import br.com.factoryhub.backend.api.dto.MachineResponse;
import br.com.factoryhub.backend.api.dto.OeeResponse;
import br.com.factoryhub.backend.api.dto.TelemetryConsolidationResponse;
import br.com.factoryhub.backend.api.dto.TelemetryResponse;
import br.com.factoryhub.backend.application.port.OperationalDataPort;
import br.com.factoryhub.backend.application.port.TelemetryConsolidationPort;
import br.com.factoryhub.backend.application.port.TelemetryDataPort;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class FactoryQueryController {
    private final OperationalDataPort operationalData;
    private final TelemetryDataPort telemetryData;
    private final ObjectProvider<TelemetryConsolidationPort> telemetryConsolidations;

    public FactoryQueryController(OperationalDataPort operationalData, TelemetryDataPort telemetryData,
                                  ObjectProvider<TelemetryConsolidationPort> telemetryConsolidations) {
        this.operationalData = operationalData;
        this.telemetryData = telemetryData;
        this.telemetryConsolidations = telemetryConsolidations;
    }

    @GetMapping("/maquinas")
    public List<MachineResponse> machines() {
        return operationalData.findMachines();
    }

    @GetMapping("/telemetria/{deviceId}/recente")
    public List<TelemetryResponse> recentTelemetry(@PathVariable String deviceId) {
        return telemetryData.findRecent(deviceId);
    }

    @GetMapping("/consolidados/{deviceId}/recente")
    public List<TelemetryConsolidationResponse> recentConsolidations(
            @PathVariable String deviceId, @RequestParam(defaultValue = "10") int limit) {
        TelemetryConsolidationPort port = telemetryConsolidations.getIfAvailable();
        return port == null ? List.of() : port.findRecent(deviceId, Math.max(1, Math.min(limit, 100)));
    }

    @GetMapping("/indicadores/{deviceId}/oee")
    public OeeResponse oee(@PathVariable String deviceId,
                           @RequestParam(defaultValue = "hoje") String periodo) {
        return operationalData.findOee(deviceId, periodo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Máquina não encontrada: " + deviceId));
    }

    @GetMapping("/alertas")
    public List<AlertResponse> alerts() {
        return operationalData.findAlerts();
    }
}
