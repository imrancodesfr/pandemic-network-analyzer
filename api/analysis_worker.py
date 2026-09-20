"""Python analysis worker for the React/Node interface.

Reads CSV paths from the command line, runs the full existing analysis
pipeline (networkx + pandas + scikit-learn), and writes newline-delimited
JSON (NDJSON) to stdout:

    {"type":"stage","stage":"<id>","label":"<text>"}
    {"type":"result","data":{ ... }}          on success
    {"type":"error","message":"<text>"}       on failure

The Node server spawns this process and streams the lines to the browser,
so the UI can show live stage progress. All Python libraries (networkx,
pandas, scikit-learn) remain the source of truth for every computation.
"""

import argparse
import json
import os
import sys

# Make project modules importable regardless of CWD.
_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT = os.path.dirname(_HERE)
if _PROJECT not in sys.path:
    sys.path.insert(0, _PROJECT)

try:
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
except Exception:
    pass

import pandas as pd
import numpy as np

from config.settings import GUARDRAIL_BANNER, INFECTION_STATUSES
from validation.dataset_validation import (
    validate_people, validate_contacts, validate_visits,
)
from validation.ui_validation import (
    validate_people_df, validate_contacts_df, validate_visits_df,
)
from validation.network_validation import validate_contact_graph
from validation.privacy_validation import validate_privacy
from validation.contact_validation import validate_contact_events
from validation.location_validation import validate_location_visits
from validation.model_validation import (
    validate_final_pipeline_features, validate_training_data,
)
from utils.errors import InsufficientDataError
from network.person_graph import build_person_graph
from network.centrality import (
    compute_degree_centrality, compute_betweenness_centrality,
    centrality_to_df, rank_by_centrality,
)
from analysis.exposure import compute_location_exposure
from analysis.hotspot import identify_hotspots, get_hotspot_summary
from analysis.data_quality import compute_data_quality
from ml.features import build_features
from ml.train import train_model, predict_risk, save_model


def emit(obj: dict):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def stage(stage_id: str, label: str):
    emit({"type": "stage", "stage": stage_id, "label": label})


def clean(obj):
    """Convert numpy/pandas objects to plain JSON-safe Python."""
    if obj is None or isinstance(obj, (bool, str, int)) :
        return obj
    if isinstance(obj, float) or isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (np.ndarray,)):
        return [clean(v) for v in obj.tolist()]
    if isinstance(obj, pd.DataFrame):
        return [clean(row) for row in obj.to_dict(orient="records")]
    if isinstance(obj, pd.Series):
        return clean(obj.to_dict())
    if isinstance(obj, dict):
        return {str(k): clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [clean(v) for v in obj]
    return str(obj)


def load_csv(path: str, label: str) -> pd.DataFrame:
    if not path:
        return pd.DataFrame()
    return pd.read_csv(path)


def main():
    parser = argparse.ArgumentParser(description="Pandemic network analysis worker")
    parser.add_argument("--people", required=True, help="Path to people.csv")
    parser.add_argument("--contacts", required=True, help="Path to contacts.csv")
    parser.add_argument("--visits", required=True, help="Path to visits.csv")
    parser.add_argument("--locations", help="Path to locations.csv (optional)")
    parser.add_argument("--model-dir", help="Directory for the saved trained model")
    args = parser.parse_args()

    try:
        stage("loading", "Loading uploaded datasets")
        people_df = load_csv(args.people, "people")
        contacts_df = load_csv(args.contacts, "contacts")
        visits_df = load_csv(args.visits, "visits")
        locations_df = load_csv(args.locations, "locations") if args.locations else pd.DataFrame()

        n_people = len(people_df)
        n_contacts = len(contacts_df)
        n_visits = len(visits_df)
        n_locations = len(locations_df)

        people_ids = set(people_df["Person_ID"]) if n_people else set()
        location_ids = (
            set(locations_df["Location_ID"])
            if n_locations and "Location_ID" in locations_df.columns
            else set(visits_df["Location_ID"]) if n_visits else set()
        )

        if n_people < 2:
            raise InsufficientDataError(
                "There are not enough people in the dataset for a meaningful "
                "network analysis (at least 2 people are required)."
            )
        if n_contacts == 0:
            raise InsufficientDataError(
                "There are not enough recorded contacts for meaningful network "
                "centrality analysis."
            )
        if n_visits == 0:
            raise InsufficientDataError(
                "Location analysis is unreliable because no visit records were supplied."
            )

        # ---- Dataset-level validation layer ----
        stage("validating", "Validating dataset structure & required columns")
        validation = {
            "people": validate_people(people_df) + validate_people_df(people_df),
            "contacts": validate_contacts(contacts_df, people_ids) + validate_contacts_df(contacts_df),
            "visits": validate_visits(visits_df, people_ids, location_ids) + validate_visits_df(visits_df),
            "contact_events": validate_contact_events(contacts_df, people_df),
            "location_visits": validate_location_visits(visits_df),
            "privacy": validate_privacy(
                list(people_df.columns),
                [str(v) for vals in people_df.head(20).values.tolist() for v in vals][:100],
            ),
        }

        # ---- Network layer ----
        stage("network", "Building contact network & computing centralities")
        G = build_person_graph(contacts_df)
        degree_cent = compute_degree_centrality(G)
        betweenness_cent = compute_betweenness_centrality(G)
        centrality_df = centrality_to_df(degree_cent, betweenness_cent, people_df)
        graph_stats = validate_contact_graph(G)
        validation["graph"] = (graph_stats["warnings"] or [{
            "status": "PASS", "code": "PASS", "message": "Contact graph validated.",
            "affected_records": 0,
        }])

        node_records = centrality_df.to_dict(orient="records")
        nodes = [{
            "id": str(r["Person_ID"]),
            "degree": clean(r["Degree_Centrality"]),
            "betweenness": clean(r["Betweenness_Centrality"]),
            "status": str(r["Infection_Status"]),
        } for r in node_records]
        edges = [[str(u), str(v)] for u, v in G.edges()]

        # ---- Exposure / hotspot layer ----
        stage("hotspots", "Analysing location exposure & identifying hotspots")
        location_exposure = compute_location_exposure(visits_df, people_df)
        hotspots = identify_hotspots(location_exposure)
        hotspot_summary = get_hotspot_summary(hotspots)

        exposure_records = []
        for r in hotspots.to_dict(orient="records"):
            exposure_records.append({
                "location_id": str(r["Location_ID"]),
                "unique_visitors": clean(r["Unique_Visitors"]),
                "total_visits": clean(r["Total_Visits"]),
                "unique_case_visitors": clean(r["Unique_Case_Visitors"]),
                "case_visitor_pct": clean(r["Case_Visitor_Pct"]),
                "exposure_rank": clean(r["Exposure_Rank"]),
                "classification": str(r["Classification"]),
            })

        # ---- Quality layer ----
        stage("quality", "Checking data quality & computed guards")
        data_quality = compute_data_quality(people_df, contacts_df, visits_df)

        # ---- ML layer ----
        stage("model", "Building risk features, training model & predicting")
        features_df = build_features(people_df, contacts_df, visits_df, degree_cent, betweenness_cent)
        validation["model_features"] = validate_final_pipeline_features(features_df)
        validation["training_data"] = validate_training_data(people_df, contacts_df, visits_df)

        ml_result = train_model(features_df)
        predictions = predict_risk(features_df, ml_result)

        if args.model_dir:
            save_model(ml_result, os.path.join(args.model_dir, "trained_model.pkl"))

        case_count = int((people_df["Infection_Status"] == "Confirmed").sum())
        status_counts = people_df["Infection_Status"].value_counts().to_dict()
        status_counts = {k: int(v) for k, v in status_counts.items()}

        tier_counts = predictions["Risk_Tier"].value_counts().to_dict()
        tier_counts = {k: int(v) for k, v in tier_counts.items()}

        pred_records = [{
            "id": str(r["Person_ID"]),
            "risk": clean(r["Predicted_Risk"]),
            "tier": str(r["Risk_Tier"]),
        } for r in predictions.to_dict(orient="records")]

        cm = ml_result["confusion_matrix"].tolist()
        top_pred = max(pred_records, key=lambda x: x["risk"], default=None)

        result = {
            "guardrails": {"banner": GUARDRAIL_BANNER},
            "dataset": {
                "people": n_people,
                "contacts": n_contacts,
                "visits": n_visits,
                "locations": n_locations,
                "cases": case_count,
                "status_counts": status_counts,
            },
            "top_degree": [[str(k), clean(v)] for k, v in rank_by_centrality(degree_cent, 25)],
            "top_betweenness": [[str(k), clean(v)] for k, v in rank_by_centrality(betweenness_cent, 25)],
            "nodes": nodes,
            "edges": edges,
            "exposure": exposure_records,
            "hotspot_summary": clean(hotspot_summary),
            "graph": clean(graph_stats),
            "data_quality": clean(data_quality),
            "validation": clean(validation),
            "model": {
                "auc": clean(ml_result["auc"]),
                "accuracy": clean(ml_result["accuracy"]),
                "precision": clean(ml_result["precision"]),
                "recall": clean(ml_result["recall"]),
                "f1": clean(ml_result["f1"]),
                "cv_f1_mean": clean(ml_result["cv_f1_mean"]),
                "cv_f1_std": clean(ml_result["cv_f1_std"]),
                "train_size": int(ml_result["train_size"]),
                "test_size": int(ml_result["test_size"]),
                "class_distribution": {str(k): int(v) for k, v in ml_result["class_distribution"].items()},
                "feature_importance": {str(k): clean(v) for k, v in ml_result["feature_importance"].items()},
                "confusion_matrix": [[int(v) for v in row] for row in cm],
            },
            "predictions": {
                "summary": tier_counts,
                "total": len(pred_records),
                "records": pred_records,
                "highest_risk": top_pred,
            },
        }

        emit({"type": "result", "data": result})
    except InsufficientDataError as e:
        emit({"type": "error", "message": str(e)})
        sys.exit(1)
    except Exception as e:  # noqa: BLE001 - worker boundary: report + non-zero exit
        emit({"type": "error", "message": f"Analysis failed: {e}"})
        sys.exit(1)


if __name__ == "__main__":
    main()