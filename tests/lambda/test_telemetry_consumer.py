import json
import sys
import urllib.error
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "terraform" / "lambda"))
import telemetry_consumer  # noqa: E402


def test_line_protocol_preserves_device_and_received_timestamps():
    line = telemetry_consumer._line_protocol({
        "device_id": "torno 01",
        "machine_type": "USINAGEM",
        "timestamp": 1_794_187_962,
        "temperatura": 72.5,
        "vibracao": 2.2,
        "rpm": 3000,
        "pecas_produzidas": 12,
        "pecas_defeito": 1,
    }, received_at_ms="1794187963000")

    assert line.startswith("machine_telemetry,device_id=torno\\ 01,machine_type=USINAGEM,data_origin=LIVE ")
    assert 'status="OPERATIONAL"' in line
    assert 'machine_state="RUNNING"' in line
    assert "device_timestamp=1794187962i" in line
    assert line.endswith("1794187963000000000")


def test_sqs_handler_reports_only_records_that_failed_influx_write(monkeypatch):
    def write_line(line):
        if "device_id=bad" in line:
            raise urllib.error.URLError("simulated Influx outage")

    monkeypatch.setattr(telemetry_consumer, "_write_line", write_line)
    payload = {"temperatura": 70, "vibracao": 2, "rpm": 3000}
    event = {"Records": [
        {"messageId": "ok-1", "body": json.dumps({**payload, "device_id": "good"})},
        {"messageId": "failed-1", "body": json.dumps({**payload, "device_id": "bad"})},
        {"messageId": "invalid-1", "body": "not-json"},
    ]}

    response = telemetry_consumer.lambda_handler(event, None)

    assert response == {"batchItemFailures": [
        {"itemIdentifier": "failed-1"},
        {"itemIdentifier": "invalid-1"},
    ]}


def test_sqs_handler_rejects_payload_missing_required_fields(monkeypatch):
    monkeypatch.setattr(telemetry_consumer, "_write_line", lambda _line: pytest.fail("must not write"))
    response = telemetry_consumer.lambda_handler({"Records": [
        {"messageId": "missing-rpm", "body": json.dumps({"device_id": "machine", "temperatura": 50, "vibracao": 1})}
    ]}, None)

    assert response["batchItemFailures"] == [{"itemIdentifier": "missing-rpm"}]
