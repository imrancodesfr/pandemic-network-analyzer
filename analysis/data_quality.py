import pandas as pd
from typing import Any


def compute_data_quality(people_df, contacts_df, visits_df) -> dict[str, Any]:
    total = len(people_df) + len(contacts_df) + len(visits_df)
    missing = people_df.isna().sum().sum() + contacts_df.isna().sum().sum() + visits_df.isna().sum().sum()
    clean = total - missing
    completeness = clean / total if total > 0 else 0

    p_dupes = people_df.duplicated().sum()
    c_dupes = contacts_df.duplicated().sum()
    v_dupes = visits_df.duplicated().sum()

    return {
        "total_records": total,
        "clean_records": clean,
        "missing_values": int(missing),
        "duplicate_records": int(p_dupes + c_dupes + v_dupes),
        "completeness": completeness,
        "people_records": len(people_df),
        "contact_records": len(contacts_df),
        "visit_records": len(visits_df),
    }
