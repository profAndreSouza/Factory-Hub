package br.com.factoryhub.backend.infrastructure.postgres;

import br.com.factoryhub.backend.api.dto.TelemetryConsolidationResponse;
import br.com.factoryhub.backend.application.port.TelemetryConsolidationRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Component
@Profile("postgres")
public class PostgresTelemetryConsolidationAdapter implements TelemetryConsolidationRepository {
    private final JdbcTemplate jdbc;

    public PostgresTelemetryConsolidationAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<String> findDeviceIds() {
        return jdbc.query("SELECT device_id FROM machines ORDER BY device_id",
                (rs, rowNum) -> rs.getString("device_id"));
    }

    @Override
    public Optional<Instant> findLastWindowEnd() {
        return jdbc.query("SELECT last_window_end FROM telemetry_consolidation_state WHERE state_id = 1",
                (rs, rowNum) -> rs.getObject("last_window_end", OffsetDateTime.class).toInstant())
                .stream().findFirst();
    }

    @Override
    @Transactional
    public void saveWindow(Instant windowStart, Instant windowEnd,
                           List<TelemetryConsolidationResponse> consolidations) {
        for (TelemetryConsolidationResponse row : consolidations) {
            jdbc.update("""
                    INSERT INTO telemetry_consolidations (
                        device_id, window_start, window_end, sample_count,
                        avg_temperatura, min_temperatura, max_temperatura,
                        avg_vibracao, min_vibracao, max_vibracao, avg_rpm,
                        total_pecas, pecas_defeito, status, data_origin
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LIVE')
                    ON CONFLICT (device_id, window_end) DO UPDATE SET
                        window_start = EXCLUDED.window_start,
                        sample_count = EXCLUDED.sample_count,
                        avg_temperatura = EXCLUDED.avg_temperatura,
                        min_temperatura = EXCLUDED.min_temperatura,
                        max_temperatura = EXCLUDED.max_temperatura,
                        avg_vibracao = EXCLUDED.avg_vibracao,
                        min_vibracao = EXCLUDED.min_vibracao,
                        max_vibracao = EXCLUDED.max_vibracao,
                        avg_rpm = EXCLUDED.avg_rpm,
                        total_pecas = EXCLUDED.total_pecas,
                        pecas_defeito = EXCLUDED.pecas_defeito,
                        status = EXCLUDED.status,
                        created_at = CURRENT_TIMESTAMP
                    """,
                    row.device_id(), utc(row.window_start()), utc(row.window_end()), row.sample_count(),
                    row.avg_temperatura(), row.min_temperatura(), row.max_temperatura(),
                    row.avg_vibracao(), row.min_vibracao(), row.max_vibracao(), row.avg_rpm(),
                    row.total_pecas(), row.pecas_defeito(), row.status());
        }

        jdbc.update("""
                INSERT INTO telemetry_consolidation_state (state_id, last_window_end, updated_at)
                VALUES (1, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (state_id) DO UPDATE SET
                    last_window_end = EXCLUDED.last_window_end,
                    updated_at = CURRENT_TIMESTAMP
                WHERE telemetry_consolidation_state.last_window_end < EXCLUDED.last_window_end
                """, utc(windowEnd));
    }

    @Override
    public List<TelemetryConsolidationResponse> findRecent(String deviceId, int limit) {
        return jdbc.query("""
                SELECT device_id, window_start, window_end, sample_count,
                       avg_temperatura, min_temperatura, max_temperatura,
                       avg_vibracao, min_vibracao, max_vibracao, avg_rpm,
                       total_pecas, pecas_defeito, status, data_origin, created_at
                FROM telemetry_consolidations
                WHERE device_id = ?
                ORDER BY window_end DESC
                LIMIT ?
                """, PostgresTelemetryConsolidationAdapter::map, deviceId, limit);
    }

    private static TelemetryConsolidationResponse map(ResultSet rs, int rowNum) throws SQLException {
        return new TelemetryConsolidationResponse(
                rs.getString("device_id"),
                rs.getObject("window_start", OffsetDateTime.class).toInstant(),
                rs.getObject("window_end", OffsetDateTime.class).toInstant(),
                rs.getInt("sample_count"),
                rs.getDouble("avg_temperatura"), rs.getDouble("min_temperatura"), rs.getDouble("max_temperatura"),
                rs.getDouble("avg_vibracao"), rs.getDouble("min_vibracao"), rs.getDouble("max_vibracao"),
                rs.getDouble("avg_rpm"), rs.getInt("total_pecas"), rs.getInt("pecas_defeito"),
                rs.getString("status"), rs.getString("data_origin"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant());
    }

    private static OffsetDateTime utc(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
