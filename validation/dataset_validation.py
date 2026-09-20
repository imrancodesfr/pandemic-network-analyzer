import pandas as pd
from typing import Any
from utils.helpers import pass_result, warning_result, error_result


def validate_people(df: pd.DataFrame) -> list[dict[str, Any]]:
    results = []
    required = ["Person_ID", "Infection_Status"]
    for col in required:
        if col not in df.columns:
            results.append(error_result("MISSING_COLUMN", f"Required column '{col}' is missing from people.csv."))
    if "Person_ID" in df.columns:
        dupes = df["Person_ID"].duplicated().sum()
        if dupes > 0:
            results.append(warning_result("DUPLICATE_PEOPLE", f"{dupes} duplicate Person_IDs found.", dupes))
        nulls = df["Person_ID"].isna().sum()
        if nulls > 0:
            results.append(warning_result("NULL_PEOPLE_ID", f"{nulls} null Person_IDs.", nulls))
    if "Infection_Status" in df.columns:
        valid = {"Confirmed", "Suspected", "Recovered", "Not_Identified", "Unknown", ""}
        invalid = df[~df["Infection_Status"].isin(valid)]
        if len(invalid) > 0:
            results.append(warning_result("INVALID_STATUS", f"{len(invalid)} records with unrecognized infection status.", len(invalid)))
        missing_date = df[df["Infection_Date"].isna() | (df["Infection_Date"] == "")].get("Infection_Status", pd.Series())
        affected = len(df[(df["Infection_Date"].isna()) | (df["Infection_Date"] == "")])
        if affected > 0:
            results.append(warning_result("MISSING_INFECTION_DATE", f"{affected} records have no infection date.", affected))
    if not results:
        results.append(pass_result("People dataset validated."))
    return results


def validate_contacts(df: pd.DataFrame, people_ids: set[str]) -> list[dict[str, Any]]:
    results = []
    required = ["Person_A", "Person_B", "Duration"]
    for col in required:
        if col not in df.columns:
            results.append(error_result("MISSING_COLUMN", f"Required column '{col}' missing from contacts.csv."))

    if "Person_A" in df.columns and "Person_B" in df.columns:
        self_loops = (df["Person_A"] == df["Person_B"]).sum()
        if self_loops > 0:
            results.append(warning_result("SELF_CONTACT", f"{self_loops} self-contact records detected.", self_loops))

        unknown_a = set(df["Person_A"].unique()) - people_ids
        unknown_b = set(df["Person_B"].unique()) - people_ids
        unknown = unknown_a | unknown_b
        if unknown:
            results.append(error_result("UNKNOWN_PERSON", f"{len(unknown)} unknown Person_IDs in contacts.", len(unknown)))

    if "Duration" in df.columns:
        neg = (df["Duration"] < 0).sum()
        if neg > 0:
            results.append(error_result("NEGATIVE_DURATION", f"{neg} negative duration values.", neg))

    if not results:
        results.append(pass_result("Contacts dataset validated."))
    return results


def validate_visits(df: pd.DataFrame, people_ids: set[str], location_ids: set[str]) -> list[dict[str, Any]]:
    results = []
    required = ["Person_ID", "Location_ID"]
    for col in required:
        if col not in df.columns:
            results.append(error_result("MISSING_COLUMN", f"Required column '{col}' missing from visits.csv."))

    if "Person_ID" in df.columns:
        unknown_p = set(df["Person_ID"].unique()) - people_ids
        if unknown_p:
            results.append(error_result("UNKNOWN_PERSON_VISIT", f"{len(unknown_p)} unknown Person_IDs in visits.", len(unknown_p)))
    if "Location_ID" in df.columns:
        unknown_l = set(df["Location_ID"].unique()) - location_ids
        if unknown_l:
            results.append(error_result("UNKNOWN_LOCATION", f"{len(unknown_l)} unknown Location_IDs in visits.", len(unknown_l)))

    if "Start_Time" in df.columns and "End_Time" in df.columns:
        try:
            start = pd.to_datetime(df["Start_Time"], format="%H:%M")
            end = pd.to_datetime(df["End_Time"], format="%H:%M")
            bad = (end <= start).sum()
            if bad > 0:
                results.append(warning_result("TIME_INVERSION", f"{bad} records with End_Time <= Start_Time.", bad))
        except Exception:
            pass

    if not results:
        results.append(pass_result("Visits dataset validated."))
    return results
