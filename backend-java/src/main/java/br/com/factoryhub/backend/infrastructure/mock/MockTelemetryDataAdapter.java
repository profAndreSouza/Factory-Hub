package br.com.factoryhub.backend.infrastructure.mock;

import br.com.factoryhub.backend.api.dto.TelemetryResponse;
import br.com.factoryhub.backend.application.port.TelemetryDataPort;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@Profile("mock & !influx")
public class MockTelemetryDataAdapter implements TelemetryDataPort {
    private static final Map<String, double[]> BASELINES = Map.of(
            "esp32-torno-01", new double[]{72.4, 2.3, 3100},
            "esp32-torno-02", new double[]{85.2, 5.1, 2870},
            "esp32-fresadora-01", new double[]{93.1, 7.4, 2640});

    @Override
    public List<TelemetryResponse> findRecent(String deviceId) {
        double[] baseline = BASELINES.get(deviceId);
        if (baseline == null) return List.of();
        List<TelemetryResponse> readings = new ArrayList<>();
        Instant now = Instant.now();
        for (int index = 29; index >= 0; index--) {
            double temperature = baseline[0] + Math.sin(index * 0.56) * 1.4;
            double vibration = Math.max(0.2, baseline[1] + Math.cos(index * 0.42) * 0.35);
            String status = temperature >= 90 || vibration >= 7 ? "CRITICAL"
                    : temperature >= 80 || vibration >= 4.5 ? "WARNING" : "OPERATIONAL";
            readings.add(new TelemetryResponse(now.minusSeconds(index * 60L),
                    Math.round(temperature * 10.0) / 10.0,
                    Math.round(vibration * 10.0) / 10.0,
                    (int) (baseline[2] + Math.round(Math.cos(index * 0.31) * 24)),
                    status, 480, 9, "RUNNING", "MOCK"));
        }
        return readings;
    }
}
