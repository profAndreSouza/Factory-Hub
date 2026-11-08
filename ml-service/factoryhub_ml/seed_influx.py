"""Create an instructional telemetry history in the configured InfluxDB bucket."""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from math import sin

from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS


DEVICES = (
    ("esp32-torno-01", "Torno CNC Célula Smart N1", "USINAGEM", 71.5, 2.0, 3100),
    ("esp32-torno-02", "Torno CNC Célula Smart N2", "USINAGEM", 82.0, 4.2, 2870),
    ("esp32-fresadora-01", "Fresadora CNC Smart N1", "FRESAGEM", 88.0, 5.0, 2640),
)


def seed() -> int:
    url = os.getenv("INFLUXDB_URL", "http://localhost:8086")
    token = os.getenv("INFLUXDB_TOKEN", "factoryhub-local-token-change-me")
    org = os.getenv("INFLUXDB_ORG", "factoryhub")
    bucket = os.getenv("INFLUXDB_BUCKET", "telemetry")
    days = max(1, int(os.getenv("INFLUXDB_SEED_DAYS", "14")))
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    start = now - timedelta(days=days)
    points: list[Point] = []

    with InfluxDBClient(url=url, token=token, org=org) as client:
        existing = client.query_api().query(
            f'from(bucket: "{bucket}") |> range(start: -{days + 1}d) '
            '|> filter(fn: (r) => r._measurement == "machine_telemetry") |> limit(n: 1)',
            org=org,
        )
        if any(table.records for table in existing):
            print("O bucket já contém telemetria; mantendo os dados existentes.")
            return 0

    for sample in range(days * 24 * 12):
        timestamp = start + timedelta(minutes=5 * sample)
        for device_index, (device_id, name, machine_type, base_temp, base_vibration, base_rpm) in enumerate(DEVICES):
            temperature = base_temp + 4.5 * sin(sample / 18 + device_index)
            vibration = max(0.2, base_vibration + 0.65 * sin(sample / 11 + device_index * 1.7))
            rpm = base_rpm + round(75 * sin(sample / 7 + device_index))
            # Introduce a few labelled anomalies so each class is represented in training.
            if (sample + device_index * 37) % 211 in range(5):
                temperature += 16
                vibration += 3.2
            produced = max(0, 450 + sample // 12 + device_index * 15)
            defects = max(0, (sample // 36 + device_index * 3) % 22)
            status = (
                "CRITICAL" if temperature >= 90 or vibration >= 7
                else "WARNING" if temperature >= 80 or vibration >= 4.5
                else "OPERATIONAL"
            )
            point = (
                Point("machine_telemetry")
                .tag("device_id", device_id)
                .tag("machine_name", name)
                .tag("machine_type", machine_type)
                .field("temperatura", round(temperature, 2))
                .field("vibracao", round(vibration, 2))
                .field("rpm", int(rpm))
                .field("status", status)
                .field("pecas_produzidas", produced)
                .field("pecas_defeito", defects)
                .time(timestamp, WritePrecision.S)
            )
            points.append(point)

    with InfluxDBClient(url=url, token=token, org=org) as client:
        write_api = client.write_api(write_options=SYNCHRONOUS)
        for offset in range(0, len(points), 1000):
            write_api.write(bucket=bucket, org=org, record=points[offset:offset + 1000])
    return len(points)


if __name__ == "__main__":
    for attempt in range(1, 13):
        try:
            count = seed()
            print(f"Seed do InfluxDB concluído: {count} medições gravadas.")
            break
        except Exception as error:
            if attempt == 12:
                raise
            print(f"InfluxDB ainda não respondeu (tentativa {attempt}/12): {error}")
            time.sleep(5)
