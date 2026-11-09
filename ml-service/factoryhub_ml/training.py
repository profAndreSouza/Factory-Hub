"""Train and persist the maintenance condition classifier."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

from .data_source import MockTrainingDataSource, TrainingDataSource

FEATURE_NAMES = ("temperatura", "vibracao", "rpm")
MODEL_VERSION = "random-forest-v1.1.0"


def _next_reading_examples(rows: list[dict[str, object]]) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Use each reading to predict the next labelled reading for that device."""
    by_device: dict[str, list[dict[str, object]]] = {}
    for row in rows:
        by_device.setdefault(str(row.get("device_id", "unknown")), []).append(row)

    examples: list[tuple[str, list[float], str]] = []
    for device_rows in by_device.values():
        device_rows.sort(key=lambda row: datetime.fromisoformat(
            str(row["timestamp"]).replace("Z", "+00:00")
        ))
        for current, following in zip(device_rows, device_rows[1:]):
            examples.append((
                str(current["timestamp"]),
                [float(current[name]) for name in FEATURE_NAMES],
                str(following["status"]),
            ))

    examples.sort(key=lambda example: example[0])
    features = np.asarray([example[1] for example in examples], dtype=np.float64)
    labels = np.asarray([example[2] for example in examples], dtype=object)
    timestamps = [example[0] for example in examples]
    return features, labels, timestamps


def load_or_train_model(
    model_path: str | Path,
    data_source: TrainingDataSource | None = None,
    progress_callback: Callable[[str, str, int], None] | None = None,
    force_retrain: bool = False,
) -> dict[str, Any]:
    """Load the persisted model, or train it once from the configured source."""
    path = Path(model_path)
    source = data_source or MockTrainingDataSource()
    if path.exists() and not force_retrain:
        artifact = joblib.load(path)
        if (artifact.get("training_source") == source.source_name
                and artifact.get("model_version") == MODEL_VERSION):
            artifact["loaded_from_disk"] = True
            return artifact

    report = progress_callback or (lambda _stage, _message, _progress: None)
    report("data", f"Consultando historico atual da fonte {source.source_name}.", 10)
    rows = source.fetch_training_rows()
    if len(rows) < 30:
        raise ValueError("The training source must provide at least 30 labelled readings.")
    report("data", f"{len(rows)} medicoes carregadas. Montando o alvo da proxima leitura.", 30)
    features, labels, timestamps = _next_reading_examples(rows)
    if len(features) < 30 or len(set(labels.tolist())) < 2:
        raise ValueError("O historico precisa ter ao menos 30 pares temporais e duas classes no alvo.")

    split_time = timestamps[int(len(timestamps) * 0.8)]
    split_index = next(
        (index for index, timestamp in enumerate(timestamps) if timestamp >= split_time),
        int(len(features) * 0.8),
    )
    if split_index < 1 or split_index >= len(features):
        raise ValueError("The history needs multiple timestamps for a future-period validation split.")
    x_train, x_test = features[:split_index], features[split_index:]
    y_train, y_test = labels[:split_index], labels[split_index:]
    if len(set(y_train.tolist())) < 2:
        raise ValueError("O periodo de treino precisa conter ao menos duas classes.")
    report(
        "preparation",
        f"{len(features)} pares temporais: {len(y_train)} para treino e {len(y_test)} para validacao futura.",
        45,
    )

    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=12,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=1,
    )
    report("modeling", "Treinando a Random Forest com 120 árvores. Esta etapa pode levar alguns segundos.", 55)
    model.fit(x_train, y_train)
    report("modeling", "Floresta treinada. Calculando métricas no conjunto de validação.", 80)
    predictions = model.predict(x_test)

    artifact: dict[str, Any] = {
        "model": model,
        "model_version": MODEL_VERSION,
        "training_source": source.source_name,
        "training_records": len(features),
        "raw_measurements": len(rows),
        "metrics": {
            "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
            "f1_macro": round(float(f1_score(y_test, predictions, average="macro")), 4),
            "test_records": len(y_test),
        },
        "feature_names": list(FEATURE_NAMES),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "loaded_from_disk": False,
    }

    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, path)
    report("complete", "Modelo salvo e pronto para novas predições.", 100)
    return artifact
