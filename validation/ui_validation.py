import pandas as pd
import numpy as np
from typing import Any
from utils.helpers import pass_result, warning_result


def validate_people_df(df: pd.DataFrame) -> list[dict[str, Any]]:
    r = []
    dupes = df.duplicated().sum()
    if dupes > 0:
        r.append(warning_result("DUPLICATE_ROWS", f"{dupes} fully duplicate rows in people.csv", dupes))
    missing_pct = df.isna().mean().mean()
    if missing_pct > 0.1:
        r.append(warning_result("HIGH_MISSING", f"{missing_pct:.1%} overall missing values", int(missing_pct * len(df))))
    if not r:
        r.append(pass_result("People data integrity OK"))
    return r


def validate_contacts_df(df: pd.DataFrame) -> list[dict[str, Any]]:
    r = []
    dupes = df.duplicated(subset=["Person_A", "Person_B", "Contact_Date"]).sum()
    if dupes > 0:
        r.append(warning_result("REPEATED_CONTACT_PAIR", f"{dupes} repeated contact pairs consolidated", dupes))
    if "Duration" in df.columns:
        q99 = df["Duration"].quantile(0.99)
        outliers = (df["Duration"] > q99 * 3).sum()
        if outliers > 0:
            r.append(warning_result("EXTREME_DURATION", f"{outliers} records with extremely high duration", outliers))
    if not r:
        r.append(pass_result("Contact data integrity OK"))
    return r


def validate_visits_df(df: pd.DataFrame) -> list[dict[str, Any]]:
    r = []
    dupes = df.duplicated(subset=["Person_ID", "Location_ID", "Visit_Date"]).sum()
    if dupes > 0:
        r.append(warning_result("REPEATED_VISIT", f"{dupes} duplicate visit records", dupes))
    if not r:
        r.append(pass_result("Visit data integrity OK"))
    return r
