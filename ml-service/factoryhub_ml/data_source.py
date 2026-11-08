"""Training data ports and the current deterministic mock provider."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Protocol

import numpy as np


class TrainingDataSource(Protocol):
    """Supplies labelled historical readings to model training.

    A future InfluxDB adapter should implement this interface and return the
    same fields, replacing only the source of the records.
    """

    source_name: str

    def fetch_training_rows(self) -> list[dict[str, object]]:
        """Return labelled sensor readings from the selected data source."""


class MockTrainingDataSource:
    """Creates repeatable synthetic historical telemetry for local learning."""

    source_name = "MOCK_TRAINING_DATA"

    def __init__(self, sample_count: int = 2400, seed: int = 42) -> None:
        self.sample_count = sample_count
        self.seed = seed

    def fetch_training_rows(self) -> list[dict[str, object]]:
        rng = np.random.default_rng(self.seed)
        temperatures = np.clip(rng.normal(77.0, 12.0, self.sample_count), 50.0, 120.0)
        vibrations = np.clip(rng.gamma(shape=2.0, scale=1.65, size=self.sample_count), 0.2, 12.0)
        rpms = rng.integers(2200, 4101, size=self.sample_count)
        start = datetime.now(timezone.utc) - timedelta(days=30)

        rows: list[dict[str, object]] = []
        for index, (temperature, vibration, rpm) in enumerate(zip(temperatures, vibrations, rpms)):
            if temperature >= 90.0 or vibration >= 7.0:
                status = "CRITICAL"
            elif temperature >= 80.0 or vibration >= 4.5:
                status = "WARNING"
            else:
                status = "OPERATIONAL"

            rows.append({
                "device_id": f"esp32-mock-{index % 6 + 1:02d}",
                "timestamp": (start + timedelta(minutes=5 * index)).isoformat(),
                "temperatura": round(float(temperature), 2),
                "vibracao": round(float(vibration), 2),
                "rpm": int(rpm),
                "status": status,
            })
        return rows
