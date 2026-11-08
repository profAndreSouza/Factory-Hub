"""Prediction and response mapping for the trained model."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np


RECOMMENDATIONS = {
    "OPERATIONAL": "Parâmetros dentro da faixa de referência. Manter o plano de manutenção vigente.",
    "WARNING": "Parâmetros em elevação. Monitorar continuamente e programar inspeção preventiva.",
    "CRITICAL": "Condição fora da faixa de operação. Reduzir carga e inspecionar a máquina antes de continuar.",
}


class PredictionService:
    def __init__(self, artifact: dict[str, Any]) -> None:
        self.model = artifact["model"]
        self.metadata = artifact

    def predict(self, request: dict[str, Any]) -> dict[str, Any]:
        values = np.asarray([[
            request["temperatura"],
            request["vibracao"],
            request["rpm"],
        ]], dtype=np.float64)

        predicted_class = str(self.model.predict(values)[0])
        class_probabilities = self.model.predict_proba(values)[0]
        probability_by_class = {
            str(label): float(probability)
            for label, probability in zip(self.model.classes_, class_probabilities)
        }
        failure_probability = 1.0 - probability_by_class.get("OPERATIONAL", 0.0)
        ui_status = {
            "OPERATIONAL": "OPERATIONAL",
            "WARNING": "ATENCAO",
            "CRITICAL": "RISCO_ANOMALIA",
        }.get(predicted_class, "ATENCAO")

        return {
            "device_id": request["device_id"],
            "status_previsto": ui_status,
            "probabilidade_falha": round(failure_probability, 4),
            "recomendacao": RECOMMENDATIONS.get(predicted_class, RECOMMENDATIONS["WARNING"]),
            "modelo_versao": self.metadata["model_version"],
            "timestamp_analise": datetime.now(timezone.utc).isoformat(),
            "source": self.metadata["training_source"],
        }
