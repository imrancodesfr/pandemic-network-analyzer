import pandas as pd
import networkx as nx
import numpy as np


def build_features(
    people_df: pd.DataFrame,
    contacts_df: pd.DataFrame,
    visits_df: pd.DataFrame,
    degree_cent: dict,
    betweenness_cent: dict,
) -> pd.DataFrame:
    case_ids = set(people_df[people_df["Infection_Status"] == "Confirmed"]["Person_ID"])

    contact_counts = contacts_df.groupby("Person_A")["Person_B"].count().to_dict()
    contact_counts_b = contacts_df.groupby("Person_B")["Person_A"].count().to_dict()
    for k, v in contact_counts_b.items():
        contact_counts[k] = contact_counts.get(k, 0) + v

    total_duration = contacts_df.groupby("Person_A")["Duration"].sum().to_dict()
    total_duration_b = contacts_df.groupby("Person_B")["Duration"].sum().to_dict()
    for k, v in total_duration_b.items():
        total_duration[k] = total_duration.get(k, 0) + v

    visit_loc_count = visits_df.groupby("Person_ID")["Location_ID"].nunique().to_dict()
    visit_count = visits_df.groupby("Person_ID").size().to_dict()

    high_assoc_locs = set()
    if "Location_ID" in visits_df.columns:
        for loc, grp in visits_df.groupby("Location_ID"):
            case_visitors = set(grp["Person_ID"]) & case_ids
            if len(case_visitors) >= 3:
                high_assoc_locs.add(loc)

    case_contact_count = {}
    contact_edges = {}
    for _, row in contacts_df.iterrows():
        a, b = row["Person_A"], row["Person_B"]
        contact_edges.setdefault(a, set()).add(b)
        contact_edges.setdefault(b, set()).add(a)
    for person, neighbors in contact_edges.items():
        case_contact_count[person] = len(neighbors & case_ids)

    case_loc_visits = {}
    for _, row in visits_df.iterrows():
        if row["Location_ID"] in high_assoc_locs:
            case_loc_visits[row["Person_ID"]] = case_loc_visits.get(row["Person_ID"], 0) + 1

    records = []
    for _, row in people_df.iterrows():
        pid = row["Person_ID"]
        records.append({
            "Person_ID": pid,
            "degree_centrality": degree_cent.get(pid, 0),
            "betweenness_centrality": betweenness_cent.get(pid, 0),
            "contact_count": contact_counts.get(pid, 0),
            "total_duration": total_duration.get(pid, 0),
            "locations_visited": visit_loc_count.get(pid, 0),
            "total_visits": visit_count.get(pid, 0),
            "case_contacts": case_contact_count.get(pid, 0),
            "high_assoc_location_visits": case_loc_visits.get(pid, 0),
            "target": 1 if pid in case_ids else 0,
        })

    return pd.DataFrame(records)
