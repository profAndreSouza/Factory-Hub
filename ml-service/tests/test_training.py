from datetime import datetime, timedelta, timezone

from factoryhub_ml.training import _next_reading_examples, load_or_train_model


def _rows(per_device: int = 80) -> list[dict[str, object]]:
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = []
    for device_number in range(3):
        for index in range(per_device):
            label = "OPERATIONAL" if index < 25 else "WARNING" if index < 50 else "CRITICAL"
            rows.append({
                "device_id": f"machine-{device_number}",
                "timestamp": (start + timedelta(seconds=index * 3 + device_number)).isoformat(),
                "temperatura": 65.0 + index / 2,
                "vibracao": 1.0 + index / 20,
                "rpm": 3000 - index,
                "status": label,
            })
    return rows


def test_temporal_examples_pair_readings_only_within_each_device():
    rows = [
        {"device_id": "a", "timestamp": "2026-01-01T00:00:00+00:00", "temperatura": 60, "vibracao": 1, "rpm": 3000, "status": "OPERATIONAL"},
        {"device_id": "b", "timestamp": "2026-01-01T00:00:01+00:00", "temperatura": 90, "vibracao": 8, "rpm": 2000, "status": "CRITICAL"},
        {"device_id": "a", "timestamp": "2026-01-01T00:00:03+00:00", "temperatura": 61, "vibracao": 1, "rpm": 3000, "status": "WARNING"},
        {"device_id": "b", "timestamp": "2026-01-01T00:00:04+00:00", "temperatura": 91, "vibracao": 8, "rpm": 2000, "status": "CRITICAL"},
    ]

    features, labels, timestamps = _next_reading_examples(rows)

    assert features.shape == (2, 3)
    assert labels.tolist() == ["WARNING", "CRITICAL"]
    assert len(timestamps) == 2


def test_training_saves_future_validation_metrics_and_model(tmp_path):
    class Source:
        source_name = "TEST_FIXTURE"

        def fetch_training_rows(self):
            return _rows()

        def count_training_rows(self):
            return {"raw_measurements": 240, "training_records": 237}

    model_path = tmp_path / "model.joblib"
    artifact = load_or_train_model(model_path, Source())

    assert model_path.is_file()
    assert artifact["training_source"] == "TEST_FIXTURE"
    assert artifact["raw_measurements"] == 240
    assert artifact["metrics"]["test_records"] > 0
    assert 0 <= artifact["metrics"]["accuracy"] <= 1
