package br.com.factoryhub.backend.infrastructure.mock;

import br.com.factoryhub.backend.api.dto.MachineReadingResponse;
import br.com.factoryhub.backend.api.dto.MachineResponse;
import br.com.factoryhub.backend.api.dto.AlertResponse;
import br.com.factoryhub.backend.api.dto.OeeResponse;
import br.com.factoryhub.backend.api.dto.TelemetryResponse;
import br.com.factoryhub.backend.application.port.OperationalDataPort;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Deterministic in-memory data for explicit offline/mock runs. */
@Component
@Profile("mock")
public class MockFactoryDataAdapter implements OperationalDataPort {
    private static final String TORNO_01 = "esp32-torno-01";
    private static final String TORNO_02 = "esp32-torno-02";
    private static final String FRESADORA_01 = "esp32-fresadora-01";

    private final Map<String, MachineResponse> machines = Map.of(
            TORNO_01, machine(TORNO_01, "Torno CNC Célula Smart N1", "USINAGEM", "OPERATIONAL", 72.4, 2.3, 3100, 480, 9),
            TORNO_02, machine(TORNO_02, "Torno CNC Célula Smart N2", "USINAGEM", "WARNING", 85.2, 5.1, 2870, 392, 18),
            FRESADORA_01, machine(FRESADORA_01, "Fresadora CNC Smart N1", "FRESAGEM", "CRITICAL", 93.1, 7.4, 2640, 305, 26));

    private final br.com.factoryhub.backend.application.port.TelemetryDataPort telemetryData;

    public MockFactoryDataAdapter(br.com.factoryhub.backend.application.port.TelemetryDataPort telemetryData) {
        this.telemetryData = telemetryData;
    }

    @Override
    public List<MachineResponse> findMachines() {
        return machines.values().stream().map(machine -> {
            List<TelemetryResponse> recent = telemetryData.findRecent(machine.id());
            if (recent.isEmpty()) return machine;
            TelemetryResponse latest = recent.get(recent.size() - 1);
            MachineReadingResponse reading = new MachineReadingResponse(
                    latest.temperatura(), latest.vibracao(), latest.rpm(), latest.status(),
                    latest.pecas_produzidas(), latest.pecas_defeito(), latest.timestamp());
            return new MachineResponse(machine.id(), machine.nome(), machine.tipo(), latest.status(), reading);
        }).toList();
    }

    @Override
    public Optional<OeeResponse> findOee(String deviceId, String period) {
        if (!machines.containsKey(deviceId)) return Optional.empty();
        String referenceDate = "hoje".equalsIgnoreCase(period) ? LocalDate.now().toString() : period;
        return Optional.of(switch (deviceId) {
            case TORNO_01 -> new OeeResponse(deviceId, referenceDate, 92.5, 96.0, 98.2, 87.2, 444, 36, 480, 471, 9, "MOCK", 28800);
            case TORNO_02 -> new OeeResponse(deviceId, referenceDate, 86.0, 89.0, 94.4, 72.3, 413, 67, 392, 374, 18, "MOCK", 28800);
            default -> new OeeResponse(deviceId, referenceDate, 95.0, 93.0, 99.0, 87.4, 456, 24, 305, 279, 26, "MOCK", 28800);
        });
    }

    @Override
    public List<AlertResponse> findAlerts() {
        Instant now = Instant.now();
        return List.of(
                new AlertResponse("mock-alert-001", FRESADORA_01, now.minusSeconds(240), 87.0,
                        "RISCO_ANOMALIA", "Vibração acima da faixa de referência. Inspecionar rolamentos e fixações.", "HIGH"),
                new AlertResponse("mock-alert-002", TORNO_02, now.minusSeconds(900), 58.0,
                        "ATENCAO", "Temperatura e vibração em elevação. Acompanhar a próxima janela de operação.", "MEDIUM"));
    }

    private static MachineResponse machine(String id, String name, String type, String status,
                                           double temperature, double vibration, int rpm,
                                           int produced, int defects) {
        return new MachineResponse(id, name, type, status,
                new MachineReadingResponse(temperature, vibration, rpm, status, produced, defects, Instant.now()));
    }

}
