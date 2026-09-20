import pandas as pd
from typing import Any
from utils.helpers import warning_result, error_result, pass_result


def validate_contact_events(df: pd.DataFrame, people_df: pd.DataFrame | None = None) -> list[dict[str, Any]]:
    """Contact validation: self-contact, duration sanity, timestamp/record consistency."""
    results: list[dict[str, Any]] = []

    if df is None or df.empty:
        results.append(warning_result("NO_CONTACT_RECORDS", "No contact records were supplied."))
        return results

    if "Person_A" in df.columns and "Person_B" in df.columns:
        self_loops = (df["Person_A"] == df["Person_B"]).sum()
        if self_loops > 0:
            results.append(warning_result(
                "SELF_CONTACT",
                f"{self_loops} self-contact records (a person contacting themselves) detected.",
                int(self_loops),
            ))

    if "Duration" in df.columns:
        neg = (df["Duration"] < 0).sum()
        if neg > 0:
            results.append(error_result(
                "NEGATIVE_DURATION",
                f"{neg} negative duration values (unphysical).",
                int(neg),
            ))
        dur = pd.to_numeric(df["Duration"], errors="coerce")
        if dur.notna().any():
            upper = dur.quantile(0.999)
            huge = (dur > upper * 5).sum() if pd.notna(upper) else 0
            if huge > 0 and dur.max() > 1440 * 7:
                results.append(warning_result(
                    "UNUSUAL_DURATION",
                    f"{huge} contact durations are unusually large and may be data-entry errors.",
                    int(huge),
                ))

    # Contradictory records: same person appears in people table with conflicting status.
    if people_df is not None and "Person_ID" in people_df.columns and "Infection_Status" in people_df.columns:
        dupes = people_df[people_df.duplicated(subset=["Person_ID"], keep=False)]
        if not dupes.empty:
            g = dupes.groupby("Person_ID")["Infection_Status"].nunique()
            conflicting = (g > 1).sum()
            if conflicting > 0:
                results.append(warning_result(
                    "CONFLICTING_STATUS",
                    f"{int(conflicting)} people have conflicting infection-status records.",
                    int(conflicting),
                ))

    if "Contact_Date" in df.columns:
        parsed = pd.to_datetime(df["Contact_Date"], errors="coerce")
        bad = parsed.isna().sum()
        if bad > 0:
            results.append(warning_result(
                "INVALID_CONTACT_DATE",
                f"{int(bad)} contact dates could not be parsed.",
                int(bad),
            ))

    if not results:
        results.append(pass_result("Contact events validated."))
    return results
