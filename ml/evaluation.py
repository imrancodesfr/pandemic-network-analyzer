from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, classification_report,
)
import numpy as np


def full_evaluation(y_true, y_pred, y_proba=None) -> dict:
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    auc = roc_auc_score(y_true, y_proba) if y_proba is not None and len(set(y_true)) > 1 else 0.5
    cm = confusion_matrix(y_true, y_pred)

    tp = cm[1][1] if cm.shape[0] > 1 else 0
    fn = cm[1][0] if cm.shape[0] > 1 else 0
    fp = cm[0][1] if cm.shape[0] > 0 else 0
    tn = cm[0][0] if cm.shape[0] > 0 else 0

    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "auc": auc,
        "tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn),
        "confusion_matrix": cm,
    }
