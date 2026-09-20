import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data.sample_generator import generate_sample_data
import os as _os

BASE = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "data", "datasets")

configs = {
    "small":   dict(n_people=500,  n_locations=20, n_contacts=1500, n_visits=1000, case_pct=0.10, seed=1),
    "medium":  dict(n_people=1000, n_locations=30, n_contacts=3000, n_visits=2000, case_pct=0.10, seed=2),
    "large":   dict(n_people=2000, n_locations=40, n_contacts=6500, n_visits=4500, case_pct=0.10, seed=3),
    "xlarge":  dict(n_people=3000, n_locations=60, n_contacts=11000, n_visits=8000, case_pct=0.10, seed=4),
}

for name, cfg in configs.items():
    out_dir = _os.path.join(BASE, name)
    _os.makedirs(out_dir, exist_ok=True)
    data = generate_sample_data(**cfg)
    for fname, df in data.items():
        df.to_csv(_os.path.join(out_dir, f"{fname}.csv"), index=False)
    total = sum(len(v) for v in data.values())
    print(f"{name:8s} -> {out_dir}")
    print(f"         people={len(data['people']):,}  contacts={len(data['contacts']):,}  "
          f"visits={len(data['visits']):,}  locations={len(data['locations']):,}  "
          f"TOTAL_RECORDS={total:,}")
print("DONE")
