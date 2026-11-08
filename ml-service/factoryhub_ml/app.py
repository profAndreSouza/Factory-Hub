"""Flask application factory for prediction and model information endpoints."""

from __future__ import annotations

import math
import os
from time import monotonic
from typing import Any

from flask import Flask, jsonify, request

from .data_source import InfluxTrainingDataSource, MockTrainingDataSource, TrainingDataSource
from .predictor import PredictionService
from .training import load_or_train_model

REQUIRED_FIELDS = ("device_id", "temperatura", "vibracao", "rpm")
RANGES = {
    "temperatura": (0.0, 150.0),
    "vibracao": (0.0, 50.0),
    "rpm": (0.0, 10000.0),
}


def create_app(
    training_data_source: TrainingDataSource | None = None,
    model_path: str | None = None,
) -> Flask:
    app = Flask(__name__)
    started_at = monotonic()
    resolved_model_path = model_path or os.getenv("ML_MODEL_PATH", "./model/maintenance_model.joblib")
    if training_data_source is not None:
        data_source = training_data_source
    elif os.getenv("ML_TRAINING_SOURCE", "mock").lower() == "influx":
        data_source = InfluxTrainingDataSource(
            url=os.getenv("INFLUXDB_URL", "http://localhost:8086"),
            token=os.getenv("INFLUXDB_TOKEN", ""),
            org=os.getenv("INFLUXDB_ORG", "factoryhub"),
            bucket=os.getenv("INFLUXDB_BUCKET", "telemetry"),
            days=int(os.getenv("ML_TRAINING_DAYS", "30")),
        )
    else:
        data_source = MockTrainingDataSource()

    artifact = load_or_train_model(resolved_model_path, data_source)
    prediction_service = PredictionService(artifact)
    app.config["prediction_service"] = prediction_service

    @app.get("/health")
    def health() -> Any:
        return jsonify({
            "status": "UP",
            "service": "factoryhub-ml-service",
            "uptime_seconds": int(monotonic() - started_at),
            "model_loaded": True,
            "model_version": artifact["model_version"],
            "training_data_source": artifact["training_source"],
            "training_records": artifact["training_records"],
            "trained_at": artifact["trained_at"],
            "metrics": artifact["metrics"],
        })

    @app.get("/model/info")
    def model_info() -> Any:
        return jsonify({
            "model_version": artifact["model_version"],
            "algorithm": "RandomForestClassifier",
            "features": artifact["feature_names"],
            "classes": [str(label) for label in prediction_service.model.classes_],
            "training_data_source": artifact["training_source"],
            "training_records": artifact["training_records"],
            "metrics": artifact["metrics"],
            "trained_at": artifact["trained_at"],
            "loaded_from_disk": artifact["loaded_from_disk"],
        })

    @app.post("/predict")
    def predict() -> Any:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "O corpo da requisição deve ser um objeto JSON."}), 400

        missing = [field for field in REQUIRED_FIELDS if field not in payload]
        if missing:
            return jsonify({"error": "Campos obrigatórios ausentes.", "fields": missing}), 400

        device_id = payload["device_id"]
        if not isinstance(device_id, str) or not device_id.strip():
            return jsonify({"error": "device_id deve ser um texto não vazio."}), 400

        normalized: dict[str, Any] = {"device_id": device_id.strip()}
        for field, (minimum, maximum) in RANGES.items():
            value = payload[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                return jsonify({"error": f"{field} deve ser um número finito."}), 400
            if not minimum <= value <= maximum:
                return jsonify({"error": f"{field} deve estar entre {minimum:g} e {maximum:g}."}), 400
            normalized[field] = float(value)

        return jsonify(prediction_service.predict(normalized))

    return app
