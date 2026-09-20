import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import pandas as pd
import numpy as np
from data.sample_generator import generate_sample_data
from validation.dataset_validation import validate_people, validate_contacts, validate_visits
from validation.ui_validation import validate_people_df, validate_contacts_df
from validation.network_validation import validate_contact_graph
from network.person_graph import build_person_graph
from network.centrality import compute_degree_centrality, compute_betweenness_centrality
from analysis.exposure import compute_location_exposure, classify_hotspot
from analysis.hotspot import identify_hotspots, get_hotspot_summary
from analysis.data_quality import compute_data_quality
from ml.features import build_features
from ml.train import train_model, predict_risk, FEATURE_COLS
from ml.evaluation import full_evaluation
from validation.contact_validation import validate_contact_events
from validation.location_validation import validate_location_visits
from validation.model_validation import validate_final_pipeline_features, validate_training_data
from utils.errors import InsufficientDataError


@pytest.fixture
def sample_data():
    return generate_sample_data(n_people=200, n_locations=10, n_contacts=500, n_visits=400, seed=42)


@pytest.fixture
def analysis_data(sample_data):
    people = sample_data["people"]
    contacts = sample_data["contacts"]
    visits = sample_data["visits"]

    G = build_person_graph(contacts)
    deg = compute_degree_centrality(G)
    btw = compute_betweenness_centrality(G)

    features = build_features(people, contacts, visits, deg, btw)
    ml = train_model(features)
    predictions = predict_risk(features, ml)

    return {
        "people": people, "contacts": contacts, "visits": visits,
        "G": G, "deg": deg, "btw": btw,
        "features": features, "ml": ml, "predictions": predictions,
    }


class TestDataGeneration:
    def test_generates_correct_shape(self, sample_data):
        assert len(sample_data["people"]) == 200
        assert len(sample_data["contacts"]) == 500
        assert len(sample_data["visits"]) == 400
        assert len(sample_data["locations"]) == 10

    def test_people_columns(self, sample_data):
        df = sample_data["people"]
        assert "Person_ID" in df.columns
        assert "Infection_Status" in df.columns
        assert "Infection_Date" in df.columns

    def test_unique_person_ids(self, sample_data):
        ids = sample_data["people"]["Person_ID"]
        assert ids.nunique() == len(ids)


class TestValidation:
    def test_people_validation_no_errors(self, sample_data):
        results = validate_people(sample_data["people"])
        errors = [r for r in results if r["status"] == "ERROR"]
        assert len(errors) == 0

    def test_contacts_no_self_loops(self, sample_data):
        df = sample_data["contacts"]
        self_loops = (df["Person_A"] == df["Person_B"]).sum()
        assert self_loops == 0

    def test_contacts_referential_integrity(self, sample_data):
        people_ids = set(sample_data["people"]["Person_ID"])
        results = validate_contacts(sample_data["contacts"], people_ids)
        errors = [r for r in results if r["status"] == "ERROR"]
        assert len(errors) == 0

    def test_ui_validation_people(self, sample_data):
        results = validate_people_df(sample_data["people"])
        assert isinstance(results, list)

    def test_ui_validation_contacts(self, sample_data):
        results = validate_contacts_df(sample_data["contacts"])
        assert isinstance(results, list)


class TestNetwork:
    def test_graph_creation(self, analysis_data):
        G = analysis_data["G"]
        assert G.number_of_nodes() > 0
        assert G.number_of_edges() > 0

    def test_degree_centrality(self, analysis_data):
        deg = analysis_data["deg"]
        assert len(deg) > 0
        for v in deg.values():
            assert 0 <= v <= 1

    def test_betweenness_centrality(self, analysis_data):
        btw = analysis_data["btw"]
        assert len(btw) > 0
        for v in btw.values():
            assert 0 <= v <= 1

    def test_network_validation(self, sample_data):
        G = build_person_graph(sample_data["contacts"])
        stats = validate_contact_graph(G)
        assert stats["total_people"] > 0
        assert stats["total_edges"] > 0


class TestExposure:
    def test_location_exposure(self, sample_data):
        result = compute_location_exposure(sample_data["visits"], sample_data["people"])
        assert len(result) > 0
        assert "Case_Visitor_Pct" in result.columns

    def test_hotspot_classification(self):
        assert classify_hotspot(0.35, 50) == "High Association"
        assert classify_hotspot(0.20, 50) == "Moderate Association"
        assert classify_hotspot(0.05, 50) == "Low Association"
        assert classify_hotspot(0.50, 5) == "Insufficient Data"

    def test_hotspot_identification(self, sample_data):
        exposure = compute_location_exposure(sample_data["visits"], sample_data["people"])
        hotspots = identify_hotspots(exposure)
        summary = get_hotspot_summary(hotspots)
        assert summary["total_locations"] > 0


class TestML:
    def test_features_shape(self, analysis_data):
        features = analysis_data["features"]
        assert len(features) == 200
        for col in FEATURE_COLS:
            assert col in features.columns
        assert "target" in features.columns

    def test_model_training(self, analysis_data):
        ml = analysis_data["ml"]
        assert ml["accuracy"] > 0
        assert ml["recall"] >= 0
        assert ml["precision"] >= 0
        assert ml["f1"] >= 0
        assert ml["auc"] > 0

    def test_predictions(self, analysis_data):
        preds = analysis_data["predictions"]
        assert len(preds) == 200
        assert "Predicted_Risk" in preds.columns
        assert "Risk_Tier" in preds.columns
        assert preds["Predicted_Risk"].between(0, 1).all()

    def test_no_leakage(self, analysis_data):
        assert "target" not in FEATURE_COLS


class TestEvaluation:
    def test_full_evaluation(self):
        y_true = np.array([1, 1, 0, 0, 1, 0, 1, 0])
        y_pred = np.array([1, 0, 0, 0, 1, 1, 1, 0])
        result = full_evaluation(y_true, y_pred)
        assert "accuracy" in result
        assert "confusion_matrix" in result
        assert result["tp"] + result["fp"] + result["tn"] + result["fn"] == 8


class TestDataQuality:
    def test_data_quality(self, sample_data):
        dq = compute_data_quality(sample_data["people"], sample_data["contacts"], sample_data["visits"])
        assert dq["total_records"] > 0
        assert 0 <= dq["completeness"] <= 1


class TestEdgeCases:
    def test_empty_contacts(self):
        people = pd.DataFrame({"Person_ID": ["P001", "P002"], "Infection_Status": ["Confirmed", "Unknown"],
                               "Infection_Date": ["2025-01-01", ""]})
        contacts = pd.DataFrame(columns=["Person_A", "Person_B", "Contact_Date", "Duration"])
        G = build_person_graph(contacts)
        assert G.number_of_nodes() == 0

    def test_single_person(self):
        people = pd.DataFrame({"Person_ID": ["P001"], "Infection_Status": ["Confirmed"],
                               "Infection_Date": ["2025-01-01"]})
        contacts = pd.DataFrame(columns=["Person_A", "Person_B", "Contact_Date", "Duration"])
        G = build_person_graph(contacts)
        deg = compute_degree_centrality(G)
        assert len(deg) == 0


class TestExtendedValidation:
    def test_contact_events_clean(self, sample_data):
        results = validate_contact_events(sample_data["contacts"], sample_data["people"])
        errors = [r for r in results if r["status"] == "ERROR"]
        assert len(errors) == 0

    def test_contact_events_detects_self_loop(self):
        df = pd.DataFrame({
            "Person_A": ["P001", "P002"], "Person_B": ["P001", "P003"],
            "Contact_Date": ["2025-01-01", "2025-01-02"], "Duration": [30, 45],
        })
        people = pd.DataFrame({"Person_ID": ["P001", "P002", "P003"],
                               "Infection_Status": ["Confirmed", "Unknown", "Unknown"]})
        results = validate_contact_events(df, people)
        codes = [r["code"] for r in results]
        assert "SELF_CONTACT" in codes

    def test_contact_events_negative_duration(self):
        df = pd.DataFrame({
            "Person_A": ["P001", "P002"], "Person_B": ["P002", "P003"],
            "Contact_Date": ["2025-01-01", "2025-01-02"], "Duration": [-5, 45],
        })
        results = validate_contact_events(df)
        assert any(r["code"] == "NEGATIVE_DURATION" for r in results)

    def test_location_visits_clean(self, sample_data):
        results = validate_location_visits(sample_data["visits"])
        errors = [r for r in results if r["status"] == "ERROR"]
        assert len(errors) == 0

    def test_location_visits_time_inversion(self):
        df = pd.DataFrame({
            "Person_ID": ["P001"], "Location_ID": ["L001"],
            "Start_Time": ["15:00"], "End_Time": ["13:00"],
        })
        results = validate_location_visits(df)
        assert any(r["code"] == "TIME_INVERSION" for r in results)

    def test_model_validation_no_leakage(self, analysis_data):
        results = validate_final_pipeline_features(analysis_data["features"])
        errors = [r for r in results if r["status"] == "ERROR"]
        assert len(errors) == 0
        assert any(r["code"] == "PASS" for r in results)

    def test_training_data_warns_on_few_cases(self, sample_data):
        results = validate_training_data(sample_data["people"], sample_data["contacts"], sample_data["visits"])
        assert isinstance(results, list)
        # Clean synthetic data should never produce an ERROR from ML training validation
        errors = [r for r in results if r["status"] == "ERROR"]
        assert len(errors) == 0

    def test_insufficient_data_guard(self):
        def guard(people, contacts, visits):
            np_ = 0 if people is None or people.empty else len(people)
            nc = 0 if contacts is None or contacts.empty else len(contacts)
            nv = 0 if visits is None or visits.empty else len(visits)
            if np_ < 2:
                raise InsufficientDataError("people")
            if nc == 0:
                raise InsufficientDataError("contacts")
            if nv == 0:
                raise InsufficientDataError("visits")

        people = pd.DataFrame({"Person_ID": ["P1", "P2"],
                               "Infection_Status": ["Confirmed", "Unknown"]})
        contacts = pd.DataFrame(columns=["Person_A", "Person_B"])
        visits = pd.DataFrame({"Person_ID": ["P1"], "Location_ID": ["L1"]})
        with pytest.raises(InsufficientDataError):
            guard(people, contacts, visits)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
