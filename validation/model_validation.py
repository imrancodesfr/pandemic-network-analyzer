import pandas as pd
from typing import Any
from utils.helpers import warning_result, error_result, pass_result
from ml.train import FEATURE_COLS


def validate_final_pipeline_features(features_df: pd.DataFrame) -> list[dict[str, Any]]:
    """ML validation: check required features exist and the target is not leaked."""
    results: list[dict[str, Any]] = []

    if features_df is None or features_df.empty:
        results.append(error_result("EMPTY_FEATURES", "No features were generated for model training."))
        return results

    missing = [c for c in FEATURE_COLS if c not in features_df.columns]
    if missing:
        results.append(error_result(
            "MISSING_FEATURES",
            f"Model input features missing: {', '.join(missing)}.",
            len(missing),
        ))

    if "target" not in features_df.columns:
        results.append(error_result("MISSING_TARGET", "Prediction target column 'target' is missing."))
    else:
        if "Infection_Status" in features_df.columns:
            leak = (features_df["Infection_Status"] == "Confirmed").astype(int).equals(
                features_df["target"] if features_df["target"].dtype == int else None
            )
        else:
            leak = False
        if leak:
            results.append(error_result(
                "TARGET_LEAKAGE",
                "The target column is directly derivable from a raw feature (data leakage).",
            ))
        else:
            results.append(pass_result("No target leakage detected: raw status fields are excluded from model features."))

    if "target" in features_df.columns:
        counts = features_df["target"].value_counts()
        if len(counts) > 1:
            pos = counts.get(1, 0)
            neg = counts.get(0, 0)
            total = pos + neg
            if total > 0:
                if pos == 0 or neg == 0:
                    results.append(warning_result(
                        "SINGLE_CLASS",
                        "Only one class present in the target; the model cannot learn a meaningful decision boundary.",
                        int(max(pos, neg)),
                    ))
                else:
                    ratio = max(pos, neg) / min(pos, neg)
                    if ratio >= 10:
                        results.append(warning_result(
                            "SEVERE_CLASS_IMBALANCE",
                            f"Severe class imbalance: {int(max(pos, neg))} vs {int(min(pos, neg))} "
                            f"({ratio:.1f}:1). Accuracy alone would be misleading.",
                            int(max(pos, neg)),
                        ))
                    elif ratio >= 5:
                        results.append(warning_result(
                            "CLASS_IMBALANCE",
                            f"Moderate class imbalance ({ratio:.1f}:1); balanced class weights are applied.",
                            int(max(pos, neg)),
                        ))

    return results


def validate_training_data(people_df: pd.DataFrame, contacts_df: pd.DataFrame,
                           visits_df: pd.DataFrame) -> list[dict[str, Any]]:
    """ML validation: dataset-size and prevalence guards before training."""
    results: list[dict[str, Any]] = []

    n_people = 0 if people_df is None or people_df.empty else len(people_df)
    n_contacts = 0 if contacts_df is None or contacts_df.empty else len(contacts_df)
    n_visits = 0 if visits_df is None or visits_df.empty else len(visits_df)

    if n_contacts < 50:
        results.append(warning_result(
            "SMALL_CONTACT_SET",
            f"Only {n_contacts} contact records; network-derived features may be unreliable.",
            n_contacts,
        ))

    cases = 0
    if people_df is not None and "Infection_Status" in people_df.columns:
        cases = (people_df["Infection_Status"] == "Confirmed").sum()
    if cases < 20:
        results.append(warning_result(
            "FEW_CASES",
            f"Only {cases} identified cases; prediction quality will be limited.",
            int(cases),
        ))

    return results
