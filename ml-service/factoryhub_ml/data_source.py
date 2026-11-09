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

    def count_training_rows(self) -> dict[str, object]:
        """Count current raw readings and one-step training examples."""


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

    def count_training_rows(self) -> dict[str, int]:
        devices = min(self.sample_count, 6)
        return {
            "raw_measurements": self.sample_count,
            "training_records": max(0, self.sample_count - devices),
        }


class InfluxTrainingDataSource:
    """Loads labelled historical sensor measurements from InfluxDB 2.x."""

    def __init__(
        self,
        url: str,
        token: str,
        org: str,
        bucket: str,
        days: int = 30,
        data_origin: str = "ALL",
    ) -> None:
        self.url = url
        self.token = token
        self.org = org
        self.bucket = bucket
        self.days = days
        self.data_origin = data_origin.upper()

    @property
    def source_name(self) -> str:
        return "INFLUXDB" if self.data_origin == "ALL" else f"INFLUXDB_{self.data_origin}"

    def for_origin(self, data_origin: str) -> "InfluxTrainingDataSource":
        return InfluxTrainingDataSource(
            self.url, self.token, self.org, self.bucket, self.days, data_origin
        )

    def fetch_training_rows(self) -> list[dict[str, object]]:
        origin_filter = "" if self.data_origin == "ALL" else (
            f'  |> filter(fn: (r) => r.data_origin == "{self.data_origin}")\n'
        )
        flux = f'''from(bucket: "{self.bucket}")
  |> range(start: -{self.days}d)
  |> filter(fn: (r) => r._measurement == "machine_telemetry")
{origin_filter}  |> filter(fn: (r) => r.data_origin == "DEMO" or r.data_origin == "LIVE")
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

    def count_training_rows(self) -> dict[str, object]:
        flux = f'''from(bucket: "{self.bucket}")
  |> range(start: -{self.days}d)
  |> filter(fn: (r) => r._measurement == "machine_telemetry" and r._field == "temperatura")
  |> filter(fn: (r) => r.data_origin == "DEMO" or r.data_origin == "LIVE")
  |> group(columns: ["device_id", "data_origin"])
  |> count(column: "_value")
'''
        with InfluxDBClient(url=self.url, token=self.token, org=self.org) as client:
            tables = client.query_api().query(query=flux, org=self.org)

        counts_by_origin = {"DEMO": [], "LIVE": []}
        for table in tables:
            for record in table.records:
                origin = str(record.values.get("data_origin", ""))
                if origin in counts_by_origin:
                    counts_by_origin[origin].append(int(record.get_value() or 0))
        origins = {
            origin: {
                "raw_measurements": sum(counts),
                "training_records": sum(max(0, count - 1) for count in counts),
            }
            for origin, counts in counts_by_origin.items()
        }
        if self.data_origin != "ALL":
            return {**origins[self.data_origin], "origins": origins}
        per_device_counts = counts_by_origin["DEMO"] + counts_by_origin["LIVE"]
        return {
            "raw_measurements": sum(per_device_counts),
            "training_records": sum(max(0, count - 1) for count in per_device_counts),
            "origins": origins,
        }
