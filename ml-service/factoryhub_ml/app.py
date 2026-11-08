"""Flask application factory for prediction and model information endpoints."""

from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from threading import Lock, Thread
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
    app.config["model_artifact"] = artifact
    training_lock = Lock()
    training_status: dict[str, Any] = {
        "state": "completed",
        "stage": "ready",
        "progress": 100,
        "message": "Modelo carregado e pronto para análise.",
        "messages": [{
            "stage": "ready",
            "message": "Modelo carregado e pronto para análise.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }],
        "metrics": artifact["metrics"],
        "training_records": artifact["training_records"],
        "training_data_source": artifact["training_source"],
        "trained_at": artifact["trained_at"],
        "model_version": artifact["model_version"],
    }

    def update_training(stage: str, message: str, progress: int) -> None:
        with training_lock:
            training_status.update({
                "state": "running",
                "stage": stage,
                "progress": progress,
                "message": message,
            })
            training_status["messages"].append({
                "stage": stage,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    def run_training() -> None:
        try:
            artifact = load_or_train_model(
                resolved_model_path,
                data_source,
                progress_callback=update_training,
                force_retrain=True,
            )
            app.config["model_artifact"] = artifact
            app.config["prediction_service"] = PredictionService(artifact)
            with training_lock:
                training_status.update({
                    "state": "completed",
                    "stage": "complete",
                    "progress": 100,
                    "message": "Treinamento concluído. O novo modelo já está ativo para as predições.",
                    "metrics": artifact["metrics"],
                    "training_records": artifact["training_records"],
                    "training_data_source": artifact["training_source"],
                    "trained_at": artifact["trained_at"],
                    "model_version": artifact["model_version"],
                })
                training_status["messages"].append({
                    "stage": "complete",
                    "message": training_status["message"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
        except Exception as error:
            with training_lock:
                training_status.update({
                    "state": "failed",
                    "stage": "failed",
                    "message": f"Falha no treinamento: {error}",
                })
                training_status["messages"].append({
                    "stage": "failed",
                    "message": training_status["message"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

    @app.post("/train")
    def start_training() -> Any:
        with training_lock:
            if training_status["state"] == "running":
                return jsonify(training_status), 202
            training_status.update({
                "state": "running",
                "stage": "starting",
                "progress": 0,
                "message": "Preparando um novo treinamento com os dados atuais do InfluxDB.",
                "messages": [],
            })
            training_status["messages"].append({
                "stage": "starting",
                "message": training_status["message"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        Thread(target=run_training, name="factoryhub-model-training", daemon=True).start()
        return jsonify(training_status), 202

    @app.get("/training/status")
    def get_training_status() -> Any:
        with training_lock:
            return jsonify(dict(training_status))

    @app.get("/health")
    def health() -> Any:
        current_artifact = app.config["model_artifact"]
        return jsonify({
            "status": "UP",
            "service": "factoryhub-ml-service",
            "uptime_seconds": int(monotonic() - started_at),
            "model_loaded": True,
            "model_version": current_artifact["model_version"],
            "training_data_source": current_artifact["training_source"],
            "training_records": current_artifact["training_records"],
            "trained_at": current_artifact["trained_at"],
            "metrics": current_artifact["metrics"],
        })

    @app.get("/model/info")
    def model_info() -> Any:
        current_artifact = app.config["model_artifact"]
        current_prediction_service = app.config["prediction_service"]
        return jsonify({
            "model_version": current_artifact["model_version"],
            "algorithm": "RandomForestClassifier",
            "features": artifact["feature_names"],
            "classes": [str(label) for label in current_prediction_service.model.classes_],
            "training_data_source": current_artifact["training_source"],
            "training_records": current_artifact["training_records"],
            "metrics": current_artifact["metrics"],
            "trained_at": current_artifact["trained_at"],
            "loaded_from_disk": current_artifact["loaded_from_disk"],
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

        return jsonify(app.config["prediction_service"].predict(normalized))

    return app
