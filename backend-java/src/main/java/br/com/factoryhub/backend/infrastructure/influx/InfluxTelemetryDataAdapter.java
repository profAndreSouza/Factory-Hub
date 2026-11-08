package br.com.factoryhub.backend.infrastructure.influx;

import br.com.factoryhub.backend.api.dto.TelemetryResponse;
import br.com.factoryhub.backend.application.port.TelemetryDataPort;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Component
@Profile("influx")
public class InfluxTelemetryDataAdapter implements TelemetryDataPort {
    private final InfluxDBClient client;
    private final String org;
    private final String bucket;

    public InfluxTelemetryDataAdapter(
            InfluxDBClient client,
            @Value("${factoryhub.influx.org}") String org,
            @Value("${factoryhub.influx.bucket}") String bucket) {
        this.client = client;
        this.org = org;
        this.bucket = bucket;
    }

    @Override
    public List<TelemetryResponse> findRecent(String deviceId) {
        String deviceFilter = deviceId == null || deviceId.isBlank()
                ? ""
                : "  |> filter(fn: (r) => r.device_id == \"" + escapeFluxString(deviceId) + "\")\n";
        String flux = "from(bucket: \"" + escapeFluxString(bucket) + "\")\n"
                + "  |> range(start: -30d)\n"
                + "  |> filter(fn: (r) => r._measurement == \"machine_telemetry\")\n"
                + "  |> filter(fn: (r) => r._field == \"temperatura\" or r._field == \"vibracao\" or r._field == \"rpm\" or r._field == \"status\" or r._field == \"pecas_produzidas\" or r._field == \"pecas_defeito\")\n"
                + deviceFilter
                + "  |> pivot(rowKey: [\"_time\", \"device_id\"], columnKey: [\"_field\"], valueColumn: \"_value\")\n"
                + "  |> sort(columns: [\"_time\"], desc: true)\n"
                + "  |> limit(n: 30)\n";

        List<TelemetryResponse> readings = new ArrayList<>();
        List<FluxTable> tables = client.getQueryApi().query(flux, org);
        for (FluxTable table : tables) {
            for (FluxRecord record : table.getRecords()) {
                Object time = record.getValueByKey("_time");
                Instant timestamp;
                if (time instanceof Instant instant) timestamp = instant;
                else if (time != null) timestamp = Instant.parse(time.toString());
                else continue;
                double temperature = number(record, "temperatura");
                double vibration = number(record, "vibracao");
                int rpm = (int) number(record, "rpm");
                String status = Objects.toString(record.getValueByKey("status"), deriveStatus(temperature, vibration));
                readings.add(new TelemetryResponse(timestamp, temperature, vibration, rpm, status,
                        (int) number(record, "pecas_produzidas"), (int) number(record, "pecas_defeito")));
            }
        }
        Collections.reverse(readings);
        return readings;
    }

    private static double number(FluxRecord record, String field) {
        Object value = record.getValueByKey(field);
        return value instanceof Number number ? number.doubleValue() : 0.0;
    }

    private static String deriveStatus(double temperature, double vibration) {
        if (temperature >= 90.0 || vibration >= 7.0) return "CRITICAL";
        if (temperature >= 80.0 || vibration >= 4.5) return "WARNING";
        return "OPERATIONAL";
    }

    private static String escapeFluxString(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
