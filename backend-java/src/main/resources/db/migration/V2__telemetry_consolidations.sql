CREATE TABLE telemetry_consolidations (
    device_id           VARCHAR(120) NOT NULL REFERENCES machines(device_id),
    window_start        TIMESTAMPTZ NOT NULL,
    window_end          TIMESTAMPTZ NOT NULL,
    sample_count        INTEGER NOT NULL CHECK (sample_count > 0),
    avg_temperatura     NUMERIC(8, 3) NOT NULL,
    min_temperatura     NUMERIC(8, 3) NOT NULL,
    max_temperatura     NUMERIC(8, 3) NOT NULL,
    avg_vibracao        NUMERIC(8, 3) NOT NULL,
    min_vibracao        NUMERIC(8, 3) NOT NULL,
    max_vibracao        NUMERIC(8, 3) NOT NULL,
    avg_rpm             NUMERIC(10, 2) NOT NULL,
    total_pecas         INTEGER NOT NULL DEFAULT 0 CHECK (total_pecas >= 0),
    pecas_defeito       INTEGER NOT NULL DEFAULT 0 CHECK (pecas_defeito >= 0),
    status              VARCHAR(40) NOT NULL,
    data_origin         VARCHAR(20) NOT NULL DEFAULT 'LIVE',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (device_id, window_end),
    CHECK (window_start < window_end)
);

CREATE INDEX idx_telemetry_consolidations_recent
    ON telemetry_consolidations (device_id, window_end DESC);

CREATE TABLE telemetry_consolidation_state (
    state_id            SMALLINT PRIMARY KEY CHECK (state_id = 1),
    last_window_end     TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
