import os

APP_TITLE = "Pandemic Network Analyzer"
APP_SUBTITLE = "Decision-Support Prototype"

DEFAULT_SEED = 42
DEFAULT_PEOPLE = 1000
DEFAULT_LOCATIONS = 50
DEFAULT_CONTACTS = 4000
DEFAULT_VISITS = 3200
DEFAULT_CASE_PCT = 0.10

INFECTION_STATUSES = ["Confirmed", "Suspected", "Recovered", "Not_Identified", "Unknown"]

REQUIRED_PEOPLE_COLS = ["Person_ID", "Infection_Status", "Infection_Date"]
REQUIRED_CONTACT_COLS = ["Person_A", "Person_B", "Contact_Date", "Duration"]
REQUIRED_VISIT_COLS = ["Person_ID", "Location_ID", "Visit_Date", "Start_Time", "End_Time"]

HOTSPOT_THRESHOLDS = {
    "high": 0.30,
    "moderate": 0.15,
}

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "sample")
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

GUARDRAIL_BANNER = (
    "[GUARDRAIL: NETWORK CENTRALITY ≠ CLINICAL PRIORITY | "
    "HIGH CASE ASSOCIATION ≠ PROOF OF CONTAMINATION | "
    "MODEL PREDICTION ≠ MEDICAL DIAGNOSIS]"
)
