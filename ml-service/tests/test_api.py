import time
from datetime import datetime, timedelta, timezone

import pytest

from factoryhub_ml.app import create_app


class IntegrationDataSource:
    source_name = "TEST_FIXTURE"

    def fetch_training_rows(self):
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        rows = []
        for device in range(3):
            for index in range(80):
                status = "OPERATIONAL" if index < 25 else "WARNING" if index < 50 else "CRITICAL"
                rows.append({
                    "device_id": f"device-{device}",
                    "timestamp": (start + timedelta(seconds=index * 3 + device)).isoformat(),
                    "temperatura": 65.0 + index / 2,
                    "vibracao": 1.0 + index / 20,
                    "rpm": 3000 - index,
                    "status": status,
                })
        return rows

    def count_training_rows(self):
        return {"raw_measurements": 240, "training_records": 237}


@pytest.fixture()
def client(tmp_path):
    app = create_app(IntegrationDataSource(), str(tmp_path / "model.joblib"))
    app.config.update(TESTING=True)
    return app.test_client()


def test_health_and_model_info_contract(client):
    health = client.get("/health")
    info = client.get("/model/info")

    assert health.status_code == 200
    assert health.json["model_loaded"] is True
    assert health.json["training_data_source"] == "TEST_FIXTURE"
    assert info.status_code == 200
    assert info.json["algorithm"] == "RandomForestClassifier"
    assert info.json["training_records"] > 0


def test_predict_validates_payload_and_returns_prediction(client):
    invalid = client.post("/predict", json={"device_id": "machine-1"})
    valid = client.post("/predict", json={
        "device_id": "machine-1", "temperatura": 96.0, "vibracao": 8.2, "rpm": 2500,
    })

    assert invalid.status_code == 400
    assert valid.status_code == 200
    assert valid.json["device_id"] == "machine-1"
    assert valid.json["status_previsto"] in {"OPERACIONAL", "ATENCAO", "RISCO_ANOMALIA"}
    assert 0 <= valid.json["probabilidade_falha"] <= 1


def test_training_endpoint_reports_completion_and_fresh_metrics(client):
    started = client.post("/train")
    assert started.status_code == 202

    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        status = client.get("/training/status").json
        if status["state"] in {"completed", "failed"}:
            break
        time.sleep(0.05)

    assert status["state"] == "completed"
    assert status["metrics"]["test_records"] > 0
    assert status["training_data_source"] == "TEST_FIXTURE"


def test_training_rejects_unknown_data_origin(client):
    response = client.post("/train", json={"data_origin": "ARCHIVE"})

    assert response.status_code == 400
    assert "ALL, DEMO ou LIVE" in response.json["error"]
