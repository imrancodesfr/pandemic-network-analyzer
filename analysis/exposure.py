import pandas as pd
from utils.helpers import safe_divide


def compute_location_exposure(visits_df: pd.DataFrame, people_df: pd.DataFrame) -> pd.DataFrame:
    case_ids = set(people_df[people_df["Infection_Status"] == "Confirmed"]["Person_ID"])
    total_cases = len(case_ids)

    location_stats = []
    for loc_id, group in visits_df.groupby("Location_ID"):
        unique_visitors = group["Person_ID"].nunique()
        total_visits = len(group)
        case_visitors = set(group["Person_ID"]) & case_ids
        unique_case_visitors = len(case_visitors)
        case_visitor_pct = safe_divide(unique_case_visitors, total_cases)

        location_stats.append({
            "Location_ID": loc_id,
            "Unique_Visitors": unique_visitors,
            "Total_Visits": total_visits,
            "Unique_Case_Visitors": unique_case_visitors,
            "Case_Visitor_Pct": case_visitor_pct,
        })

    df = pd.DataFrame(location_stats)
    if len(df) > 0:
        df["Exposure_Rank"] = df["Case_Visitor_Pct"].rank(ascending=False).astype(int)
    return df.sort_values("Case_Visitor_Pct", ascending=False)


def classify_hotspot(case_visitor_pct: float, total_visitors: int, thresholds: dict | None = None) -> str:
    if total_visitors < 10:
        return "Insufficient Data"
    if thresholds is None:
        thresholds = {"high": 0.30, "moderate": 0.15}
    if case_visitor_pct >= thresholds["high"]:
        return "High Association"
    elif case_visitor_pct >= thresholds["moderate"]:
        return "Moderate Association"
    return "Low Association"
