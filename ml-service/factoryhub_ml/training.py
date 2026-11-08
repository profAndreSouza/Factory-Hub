"""Train and persist the maintenance condition classifier."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

from .data_source import MockTrainingDataSource, TrainingDataSource

FEATURE_NAMES = ("temperatura", "vibracao", "rpm")
MODEL_VERSION = "random-forest-mock-v1.0.0"


def load_or_train_model(
    model_path: str | Path,
    data_source: TrainingDataSource | None = None,
) -> dict[str, Any]:
    """Load the persisted model, or train it once from the configured source."""
    path = Path(model_path)
    if path.exists():
        artifact = joblib.load(path)
        artifact["loaded_from_disk"] = True
        return artifact

    source = data_source or MockTrainingDataSource()
    rows = source.fetch_training_rows()
    if len(rows) < 30:
        raise ValueError("A fonte de treino precisa fornecer ao menos 30 medições rotuladas.")

    features = np.asarray(
        [[float(row[name]) for name in FEATURE_NAMES] for row in rows],
        dtype=np.float64,
    )
    labels = np.asarray([str(row["status"]) for row in rows], dtype=object)
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=12,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=1,
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)

    artifact: dict[str, Any] = {
        "model": model,
        "model_version": MODEL_VERSION,
        "training_source": source.source_name,
        "training_records": len(rows),
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
    return artifact
