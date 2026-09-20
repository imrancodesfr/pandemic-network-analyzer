import pandas as pd
from typing import Any
from utils.helpers import warning_result, error_result, pass_result


def validate_location_visits(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Location validation: visit-event vs unique-visitor separation, timestamp sanity, coverage."""
    results: list[dict[str, Any]] = []

    if df is None or df.empty:
        results.append(warning_result("NO_VISIT_RECORDS", "No visit records were supplied."))
        return results

    if "Person_ID" in df.columns and "Location_ID" in df.columns:
        unique_people = df["Person_ID"].nunique()
        unique_locations = df["Location_ID"].nunique()
        total_events = len(df)

        if total_events == 0:
            results.append(warning_result("EMPTY_VISITS", "Visit dataset is empty; location analysis is unreliable."))

        # Rule 7: unique people vs repeated events must stay separate.
        ignore = set(df.columns) - {"Person_ID", "Location_ID", "Visit_Date", "Start_Time", "End_Time"}
        exact_dupes = df.duplicated(subset=list(df.columns), keep=False).sum()
        if exact_dupes > 0:
            results.append(warning_result(
                "REPEATED_VISITS",
                f"{exact_dupes} repeated visit-event rows detected. Visit events are counted separately "
                f"from unique visitors (Rule 7).",
                int(exact_dupes),
            ))

        if unique_locations == 0:
            results.append(error_result("ZERO_LOCATIONS", "No distinct locations referenced in visits."))
        elif unique_locations < 5:
            results.append(warning_result(
                "FEW_LOCATIONS",
                f"Only {unique_locations} distinct locations referenced; location ranking is limited.",
                int(unique_locations),
            ))

    if "Start_Time" in df.columns and "End_Time" in df.columns:
        try:
            start = pd.to_datetime(df["Start_Time"], format="%H:%M", errors="coerce")
            end = pd.to_datetime(df["End_Time"], format="%H:%M", errors="coerce")
            bad_start = start.isna().sum()
            bad_end = end.isna().sum()
            if bad_start or bad_end:
                results.append(warning_result(
                    "INVALID_VISIT_TIME",
                    f"{int(bad_start + bad_end)} visit timestamps could not be parsed.",
                    int(bad_start + bad_end),
                ))
            inverted = (end <= start).sum()
            if inverted > 0:
                results.append(error_result(
                    "TIME_INVERSION",
                    f"{int(inverted)} visits have End_Time before Start_Time.",
                    int(inverted),
                ))
        except Exception:
            pass

    if not results:
        results.append(pass_result("Location visits validated."))
    return results
