package br.com.factoryhub.backend.infrastructure.postgres;

import br.com.factoryhub.backend.api.dto.AlertResponse;
import br.com.factoryhub.backend.api.dto.MachineReadingResponse;
import br.com.factoryhub.backend.api.dto.MachineResponse;
import br.com.factoryhub.backend.api.dto.OeeResponse;
import br.com.factoryhub.backend.api.dto.PredictionResponse;
import br.com.factoryhub.backend.api.dto.TelemetryResponse;
import br.com.factoryhub.backend.application.port.OperationalDataPort;
import br.com.factoryhub.backend.application.port.TelemetryDataPort;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Component
@Profile("postgres")
public class PostgresOperationalDataAdapter implements OperationalDataPort {
    private final JdbcTemplate jdbc;
    private final TelemetryDataPort telemetry;

    public PostgresOperationalDataAdapter(JdbcTemplate jdbc, TelemetryDataPort telemetry) {
        this.jdbc = jdbc;
        this.telemetry = telemetry;
    }

    @Override
    public List<MachineResponse> findMachines() {
        List<MachineResponse> machines = jdbc.query(
                "SELECT device_id, name, machine_type FROM machines ORDER BY device_id",
                (rs, rowNum) -> new MachineResponse(
                        rs.getString("device_id"), rs.getString("name"), rs.getString("machine_type"),
                        "UNKNOWN", null));

        return machines.stream().map(machine -> {
            List<TelemetryResponse> readings = telemetry.findRecent(machine.id());
            if (readings.isEmpty()) return machine;

            TelemetryResponse latest = readings.get(readings.size() - 1);
            MachineReadingResponse reading = new MachineReadingResponse(
                    latest.temperatura(), latest.vibracao(), latest.rpm(), latest.status(),
                    latest.pecas_produzidas(), latest.pecas_defeito(), latest.timestamp());
            return new MachineResponse(machine.id(), machine.nome(), machine.tipo(), latest.status(), reading);
        }).toList();
    }

    @Override
    public Optional<OeeResponse> findOee(String deviceId, String period) {
        LocalDate date = "hoje".equalsIgnoreCase(period) ? LocalDate.now() : LocalDate.parse(period);
        return jdbc.query("""
                        SELECT device_id, period_date, availability, performance, quality, oee,
                               operating_minutes, downtime_minutes, total_parts, good_parts, scrap_parts
                        FROM oee_snapshots
                        WHERE device_id = ? AND period_date = ?
                        """,
                (rs, rowNum) -> mapOee(rs), deviceId, date).stream().findFirst();
    }

    @Override
    public List<AlertResponse> findAlerts() {
        return jdbc.query("""
                        SELECT id, device_id, occurred_at, failure_probability, predicted_status,
                               recommendation, severity
                        FROM alerts
                        ORDER BY occurred_at DESC
                        LIMIT 100
                        """,
                (rs, rowNum) -> new AlertResponse(
                        Long.toString(rs.getLong("id")),
                        rs.getString("device_id"),
                        rs.getObject("occurred_at", OffsetDateTime.class).toInstant(),
                        rs.getDouble("failure_probability"),
                        rs.getString("predicted_status"),
                        rs.getString("recommendation"),
                        rs.getString("severity")));
    }

    @Override
    @Transactional
    public void recordPrediction(PredictionResponse prediction) {
        if ("OPERATIONAL".equalsIgnoreCase(prediction.status_previsto())) return;

        String severity = "RISCO_ANOMALIA".equalsIgnoreCase(prediction.status_previsto())
                ? "HIGH" : "MEDIUM";
        jdbc.update("""
                        INSERT INTO alerts (
                            device_id, occurred_at, failure_probability, predicted_status,
                            recommendation, severity, data_origin
                        ) VALUES (?, ?, ?, ?, ?, ?, 'MODEL')
                        """,
                prediction.device_id(), OffsetDateTime.ofInstant(prediction.timestampAnalise(), ZoneOffset.UTC),
                prediction.probabilidade_falha() * 100.0, prediction.status_previsto(),
                prediction.recomendacao(), severity);
    }

    private static OeeResponse mapOee(ResultSet rs) throws SQLException {
        return new OeeResponse(
                rs.getString("device_id"), rs.getDate("period_date").toLocalDate().toString(),
                rs.getDouble("availability"), rs.getDouble("performance"), rs.getDouble("quality"),
                rs.getDouble("oee"), rs.getInt("operating_minutes"), rs.getInt("downtime_minutes"),
                rs.getInt("total_parts"), rs.getInt("good_parts"), rs.getInt("scrap_parts"));
    }
}
