"""SQS event handler that writes Factory Hub telemetry to InfluxDB 2.x."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any


def _escape_tag(value: object) -> str:
    return str(value).replace("\\", "\\\\").replace(" ", "\\ ").replace(",", "\\,").replace("=", "\\=")


def _escape_string(value: object) -> str:
    return str(value).replace("\\", "\\\\").replace('"', '\\"')


def _timestamp_ns(value: object) -> int:
    if value is None:
        return int(datetime.now(timezone.utc).timestamp() * 1_000_000_000)
    if isinstance(value, (int, float)):
        numeric = int(value)
        if numeric < 100_000_000_000:
            return numeric * 1_000_000_000
        if numeric < 100_000_000_000_000:
            return numeric * 1_000_000
        if numeric < 100_000_000_000_000_000:
            return numeric * 1_000
        return numeric
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return int(parsed.timestamp() * 1_000_000_000)


def _line_protocol(payload: dict[str, Any]) -> str:
    device_id = _escape_tag(payload.get("device_id", "unknown"))
    machine_type = _escape_tag(payload.get("machine_type", "CNC"))
    temperature = float(payload["temperatura"])
    vibration = float(payload["vibracao"])
    rpm = int(payload["rpm"])
    status = str(payload.get("status") or (
        "CRITICAL" if temperature >= 90 or vibration >= 7
        else "WARNING" if temperature >= 80 or vibration >= 4.5
        else "OPERATIONAL"
    ))
    machine_state = str(payload.get("machine_state") or ("RUNNING" if rpm > 0 else "STOPPED"))
    fields = [
        f'temperatura={temperature}',
        f'vibracao={vibration}',
        f'rpm={rpm}i',
        f'status="{_escape_string(status)}"',
        f'machine_state="{_escape_string(machine_state)}"',
    ]
    if payload.get("pecas_produzidas") is not None:
        fields.append(f'pecas_produzidas={int(payload["pecas_produzidas"])}i')
    if payload.get("pecas_defeito") is not None:
        fields.append(f'pecas_defeito={int(payload["pecas_defeito"])}i')
    return f'machine_telemetry,device_id={device_id},machine_type={machine_type},data_origin=LIVE {",".join(fields)} {_timestamp_ns(payload.get("timestamp"))}'


def _write_line(line: str) -> None:
    query = urllib.parse.urlencode({
        "org": os.environ["INFLUX_ORG"],
        "bucket": os.environ["INFLUX_BUCKET"],
        "precision": "ns",
    })
    request = urllib.request.Request(
        f'{os.environ["INFLUX_URL"].rstrip("/")}/api/v2/write?{query}',
        data=line.encode("utf-8"),
        headers={
            "Authorization": f'Token {os.environ["INFLUX_TOKEN"]}',
            "Content-Type": "text/plain; charset=utf-8",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        if response.status not in (204, 200):
            raise RuntimeError(f"InfluxDB respondeu HTTP {response.status}")


def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, list[dict[str, str]]]:
    failures: list[dict[str, str]] = []
    for record in event.get("Records", []):
        message_id = str(record.get("messageId", "unknown"))
        try:
            payload = json.loads(record["body"])
            if not isinstance(payload, dict):
                raise ValueError("Mensagem SQS deve conter um objeto JSON")
            for required in ("device_id", "temperatura", "vibracao", "rpm"):
                if required not in payload:
                    raise ValueError(f"Campo obrigatório ausente: {required}")
            _write_line(_line_protocol(payload))
        except (KeyError, TypeError, ValueError, urllib.error.URLError, TimeoutError, RuntimeError):
            failures.append({"itemIdentifier": message_id})
    return {"batchItemFailures": failures}
