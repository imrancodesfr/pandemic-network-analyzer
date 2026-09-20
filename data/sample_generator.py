import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_sample_data(
    n_people: int = 1000,
    n_locations: int = 50,
    n_contacts: int = 4000,
    n_visits: int = 3200,
    case_pct: float = 0.10,
    seed: int = 42,
) -> dict[str, pd.DataFrame]:
    rng = np.random.default_rng(seed)

    n_people = int(n_people)
    n_locations = int(n_locations)
    n_contacts = int(n_contacts)
    n_visits = int(n_visits)

    person_ids = [f"P{str(i).zfill(3)}" for i in range(1, n_people + 1)]
    location_ids = [f"LOC{str(i).zfill(3)}" for i in range(1, n_locations + 1)]

    statuses = rng.choice(
        ["Confirmed", "Suspected", "Recovered", "Not_Identified", "Unknown"],
        size=n_people,
        p=[case_pct, 0.05, 0.05, 0.50, 0.40 - case_pct],
    )

    base_date = datetime(2025, 1, 1)
    infection_dates = []
    for s in statuses:
        if s in ("Confirmed", "Suspected", "Recovered"):
            infection_dates.append((base_date + timedelta(days=int(rng.integers(1, 15)))).strftime("%Y-%m-%d"))
        else:
            infection_dates.append("")

    people_df = pd.DataFrame({
        "Person_ID": person_ids,
        "Infection_Status": statuses,
        "Infection_Date": infection_dates,
        "Age_Group": rng.choice(["18-29", "30-44", "45-59", "60+"], n_people),
        "Sex": rng.choice(["M", "F"], n_people),
    })

    case_indices = [i for i, s in enumerate(statuses) if s == "Confirmed"]
    case_idx_set = set(case_indices)
    n_cases = len(case_indices)

    n_communities = max(3, min(10, int(n_people / 100)))
    community_assign = rng.integers(0, n_communities, n_people)

    contact_src = []
    contact_dst = []
    contact_dates = []
    durations = []
    for _ in range(n_contacts):
        c1 = rng.integers(0, n_people)
        if rng.random() < 0.75 and n_people > 1:
            same_comm = np.where(community_assign == community_assign[c1])[0]
            c2 = rng.choice(same_comm[same_comm != c1]) if len(same_comm > 1) else rng.integers(0, n_people)
        else:
            c2 = rng.integers(0, n_people)
        while c2 == c1:
            c2 = rng.integers(0, n_people)
        contact_src.append(c1)
        contact_dst.append(c2)
        contact_dates.append((base_date + timedelta(days=int(rng.integers(1, 15)))).strftime("%Y-%m-%d"))
        durations.append(int(rng.integers(5, 480)))

    contacts_df = pd.DataFrame({
        "Person_A": [person_ids[i] for i in contact_src],
        "Person_B": [person_ids[i] for i in contact_dst],
        "Contact_Date": contact_dates,
        "Duration": durations,
    })

    n_hotspot_locs = max(3, int(n_locations * 0.15))
    hotspot_loc_indices = np.arange(n_hotspot_locs)

    visit_person_idx = []
    visit_loc_idx = []
    visit_dates = []
    start_hours = []
    end_hours_list = []

    for _ in range(n_visits):
        if n_cases > 0 and rng.random() < 0.35:
            p_idx = rng.choice(case_indices)
        else:
            p_idx = rng.integers(0, n_people)

        if rng.random() < 0.30:
            loc_idx = rng.choice(hotspot_loc_indices)
        else:
            loc_idx = rng.integers(0, n_locations)

        visit_person_idx.append(p_idx)
        visit_loc_idx.append(loc_idx)
        visit_dates.append((base_date + timedelta(days=int(rng.integers(1, 15)))).strftime("%Y-%m-%d"))
        sh = int(rng.integers(7, 20))
        start_hours.append(sh)
        end_hours_list.append(min(sh + int(rng.integers(1, 6)), 23))

    visits_df = pd.DataFrame({
        "Person_ID": [person_ids[i] for i in visit_person_idx],
        "Location_ID": [location_ids[i] for i in visit_loc_idx],
        "Visit_Date": visit_dates,
        "Start_Time": [f"{int(h):02d}:00" for h in start_hours],
        "End_Time": [f"{int(h):02d}:00" for h in end_hours_list],
    })

    location_names = [
        "Metro Central Transit Hub", "St. Jude Healthcare Clinic",
        "Grand Plaza Supermarket", "Downtown Community Gym",
        "Harbor Logistics Warehouse", "Suburban Kiosk Express",
        "City Park Pavilion", "Riverside Café", "Central Library",
        "Municipal Office Complex", "Airport Terminal B",
        "Bus Depot South", "University Campus Hall",
        "Shopping Mall East", "Pharmacy Plus Downtown",
    ] + [f"Venue_{i}" for i in range(16, n_locations + 1)]

    locations_df = pd.DataFrame({
        "Location_ID": location_ids,
        "Location_Name": location_names[:n_locations],
        "Location_Type": rng.choice(
            ["Transit", "Healthcare", "Retail", "Fitness", "Industrial", "Food", "Education", "Office"],
            n_locations,
        ),
    })

    return {
        "people": people_df,
        "contacts": contacts_df,
        "visits": visits_df,
        "locations": locations_df,
    }


def save_sample_data(data: dict[str, pd.DataFrame], directory: str) -> list[str]:
    import os
    os.makedirs(directory, exist_ok=True)
    paths = []
    for name, df in data.items():
        p = os.path.join(directory, f"{name}.csv")
        df.to_csv(p, index=False)
        paths.append(p)
    return paths
