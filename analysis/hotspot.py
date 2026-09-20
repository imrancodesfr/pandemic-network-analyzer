import pandas as pd
from utils.helpers import safe_divide


def identify_hotspots(location_exposure_df: pd.DataFrame, thresholds: dict | None = None) -> pd.DataFrame:
    df = location_exposure_df.copy()
    if thresholds is None:
        thresholds = {"high": 0.30, "moderate": 0.15}

    conditions = []
    for _, row in df.iterrows():
        if row["Unique_Visitors"] < 10:
            conditions.append("Insufficient Data")
        elif row["Case_Visitor_Pct"] >= thresholds["high"]:
            conditions.append("High Association")
        elif row["Case_Visitor_Pct"] >= thresholds["moderate"]:
            conditions.append("Moderate Association")
        else:
            conditions.append("Low Association")

    df["Classification"] = conditions
    return df


def get_hotspot_summary(df: pd.DataFrame) -> dict:
    counts = df["Classification"].value_counts().to_dict()
    return {
        "total_locations": len(df),
        "high_association": counts.get("High Association", 0),
        "moderate_association": counts.get("Moderate Association", 0),
        "low_association": counts.get("Low Association", 0),
        "insufficient_data": counts.get("Insufficient Data", 0),
    }
