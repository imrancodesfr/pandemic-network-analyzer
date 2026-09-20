import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score,
)
import pickle
import os


FEATURE_COLS = [
    "degree_centrality", "betweenness_centrality", "contact_count",
    "total_duration", "locations_visited", "total_visits",
    "case_contacts", "high_assoc_location_visits",
]


def train_model(features_df: pd.DataFrame, test_size: float = 0.2, seed: int = 42) -> dict:
    X = features_df[FEATURE_COLS].fillna(0)
    y = features_df["target"]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=test_size, random_state=seed, stratify=y if y.sum() > 1 else None,
    )

    X_train_np = np.array(X_train) if not isinstance(X_train, np.ndarray) else X_train
    X_test_np = np.array(X_test) if not isinstance(X_test, np.ndarray) else X_test

    model = RandomForestClassifier(
        n_estimators=100, max_depth=10, random_state=seed, class_weight="balanced"
    )
    model.fit(X_train_np, y_train)

    y_pred = model.predict(X_test_np)
    y_proba = model.predict_proba(X_test_np)[:, 1] if len(model.classes_) > 1 else np.zeros(len(y_test))

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_proba) if len(set(y_test)) > 1 else 0.5
    cm = confusion_matrix(y_test, y_pred)

    importance = dict(zip(FEATURE_COLS, model.feature_importances_))

    cv_scores = cross_val_score(model, X_scaled, y, cv=min(5, max(2, int(y.sum()))), scoring="f1")

    return {
        "model": model,
        "scaler": scaler,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "auc": auc,
        "confusion_matrix": cm,
        "feature_importance": importance,
        "cv_f1_mean": cv_scores.mean(),
        "cv_f1_std": cv_scores.std(),
        "train_size": len(X_train_np),
        "test_size": len(X_test_np),
        "class_distribution": y.value_counts().to_dict(),
    }


def predict_risk(features_df: pd.DataFrame, model_result: dict) -> pd.DataFrame:
    model = model_result["model"]
    scaler = model_result["scaler"]
    X = features_df[FEATURE_COLS].fillna(0)
    X_scaled = scaler.transform(X)
    probas = model.predict_proba(X_scaled)[:, 1] if len(model.classes_) > 1 else np.zeros(len(X))

    result_df = features_df[["Person_ID"]].copy()
    result_df["Predicted_Risk"] = probas
    result_df["Risk_Tier"] = pd.cut(
        probas,
        bins=[-0.01, 0.40, 0.70, 1.01],
        labels=["Low", "Moderate", "High"],
    )
    return result_df.sort_values("Predicted_Risk", ascending=False)


def save_model(model_result: dict, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        pickle.dump({"model": model_result["model"], "scaler": model_result["scaler"]}, f)
