"""Training data ports with InfluxDB and deterministic mock providers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Protocol

import numpy as np
from influxdb_client import InfluxDBClient


class TrainingDataSource(Protocol):
    """Supplies labelled historical readings to model training.

    Adapters return the same fields regardless of the underlying source.
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


class InfluxTrainingDataSource:
    """Loads labelled historical sensor measurements from InfluxDB 2.x."""

    source_name = "INFLUXDB"

    def __init__(
        self,
        url: str,
        token: str,
        org: str,
        bucket: str,
        days: int = 30,
    ) -> None:
        self.url = url
        self.token = token
        self.org = org
        self.bucket = bucket
        self.days = days

    def fetch_training_rows(self) -> list[dict[str, object]]:
        flux = f'''from(bucket: "{self.bucket}")
  |> range(start: -{self.days}d)
  |> filter(fn: (r) => r._measurement == "machine_telemetry")
  |> filter(fn: (r) => r._field == "temperatura" or r._field == "vibracao" or r._field == "rpm" or r._field == "pecas_produzidas" or r._field == "pecas_defeito")
  |> pivot(rowKey: ["_time", "device_id"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"])
'''
        with InfluxDBClient(url=self.url, token=self.token, org=self.org) as client:
            tables = client.query_api().query(query=flux, org=self.org)

        rows: list[dict[str, object]] = []
        for table in tables:
            for record in table.records:
                values = record.values
                temperature = values.get("temperatura")
                vibration = values.get("vibracao")
                rpm = values.get("rpm")
                if temperature is None or vibration is None or rpm is None:
                    continue

                if temperature >= 90.0 or vibration >= 7.0:
                    status = "CRITICAL"
                elif temperature >= 80.0 or vibration >= 4.5:
                    status = "WARNING"
                else:
                    status = "OPERATIONAL"

                rows.append({
                    "device_id": str(values.get("device_id", "unknown")),
                    "timestamp": record.get_time().isoformat(),
                    "temperatura": float(temperature),
                    "vibracao": float(vibration),
                    "rpm": int(rpm),
                    "status": status,
                })
        return rows
