# 🔬 Pandemic Network Analyzer

A **network-analysis and machine-learning decision-support system** that models
recorded person-to-person contacts and person-to-location exposure data to
identify structurally important individuals, potential exposure hotspots, and
model-based risk patterns during an outbreak scenario.

Built as a three-tier stack:

| Tier | Tech | Responsibility |
|------|------|----------------|
| **UI** | React · Vite · Plotly.js | Upload flow, live analysis progress, dashboard & explorer |
| **API** | Node.js · Express | File intake, spawns the Python engine, streams progress as NDJSON |
| **Engine** | Python · NetworkX · Pandas · Scikit-learn | **All** analysis & ML — never approximated in the UI |

---

## 🚀 How To Run It

### Step 1 — Install the Python engine

```bash
pip install -r requirements.txt
```

Requires Python 3.10+ (tested on 3.14). This creates the network graphs,
centrality, hotspots, and the trained Random Forest model.

### Step 2 — Install Node dependencies

```bash
cd server
npm install
```

### Step 3 — Install & build the React UI

```bash
cd frontend
npm install
npm run build
```

> You only build once. `npm run build` outputs the static app to `frontend/dist`
> (which is what the server serves). If `npm install` warns about blocked
> install scripts (esbuild), run `npm approve-scripts esbuild` first.

### Step 4 — Start everything

```bash
cd server
npm start
```

Open **http://localhost:3000**

That single server does two jobs:
- **Serves the React app** (from `frontend/dist`)
- **Exposes the API**: `POST /api/analyze`, `GET /api/sample`, `GET /api/health` — each request delegates all computation to the Python worker (`api/analysis_worker.py`).

---

### 🧪 Development mode (optional, live-reload UI)

Run two terminals:

```bash
# terminal 1 — API
cd server
npm start            # http://localhost:3000

# terminal 2 — UI with hot reload
cd frontend
npm run dev          # http://localhost:5173  (proxies /api to :3000)
```

### ✅ Run the Python test suite

```bash
pytest tests/ -v     # 31 tests: validation, ML guards, graph, exposure, edge cases
```

### 🐍 Run the analysis worker standalone (no UI)

```bash
python -u api/analysis_worker.py \
  --people data/datasets/small/people.csv \
  --contacts data/datasets/small/contacts.csv \
  --visits data/datasets/small/visits.csv \
  --locations data/datasets/small/locations.csv
```

---

## 🖱️ Using The App

1. **Upload data** — drag your CSVs into the drop zone. Roles
   (`people` / `contacts` / `visits` / `locations`) are detected automatically
   from the columns. Each file shows a status row: role, size, row estimate,
   and its columns with required ones highlighted. Or click a **sample** button
   (`small` / `medium` / `large` / `xlarge`) to load bundled data instantly.
2. **Run Analysis** — the button is disabled until `people`, `contacts` and
   `visits` are all present. You decide when to start — nothing runs silently.
3. **Watch progress** — 6 live stages stream from the Python engine
   (`loading → validating → network → hotspots → quality → model`).
4. **Explore results** — four tabs:

| Tab | Contents |
|-----|----------|
| **Overview** | Dataset summary, data quality, status mix, hotspot counts, top hubs, model snapshot |
| **Data Validation** | Full 9-layer validation registry with PASS / WARNING / ERROR chips |
| **Risk Prediction** | Random Forest metrics, confusion matrix, feature importance, searchable + tier-filtered predictions |
| **Network Explorer** | Top-25/50/All contact-network graph, searchable node inspector, location-exposure chart, hotspot table |

---

## 📁 Sample Datasets

Four pre-built datasets live in `data/datasets/`. Each folder contains
`people.csv`, `contacts.csv`, `visits.csv`, `locations.csv`.

| Folder | People | Contacts | Visits | Total records |
|--------|-------:|---------:|-------:|--------------:|
| `small`  | 500  | 1,500 | 1,000 | ~3,000 |
| `medium` | 1,000 | 3,000 | 2,000 | ~6,000 |
| `large`  | 2,000 | 6,500 | 4,500 | ~13,000 |
| `xlarge` | 3,000 | 11,000 | 8,000 | ~22,000 |

Each runs cleanly through validation, network centrality, hotspot analysis, and
the prediction model. Regenerate/extend them with `python generate_datasets.py`.

---

## 🗂️ Project Structure

```
pandemic-network-analyzer/
│
├── app.py                     # (optional) legacy Streamlit dashboard — still runnable
│
├── api/
│   └── analysis_worker.py     # Python engine worker: CSV -> NDJSON progress + JSON result
│
├── server/                    # Node.js API + static host
│   ├── index.js               # Express: /api/analyze, /api/sample, /api/health
│   └── e2e.test.mjs           # End-to-end API test (spawns server, runs a full analysis)
│
├── frontend/                  # React + Vite UI
│   ├── src/
│   │   ├── App.jsx            # 3-step flow: upload -> analyze -> results
│   │   ├── lib/               # API client + CSV role detection helpers
│   │   └── components/        # Upload/analyze steps + 4 result tabs + Plotly wrapper
│   └── vite.config.js         # dev proxy: /api -> localhost:3000
│
├── config/settings.py         # Constants, thresholds, default params
│
├── data/
│   ├── sample_generator.py    # Reproducible synthetic outbreak data
│   ├── generate_datasets.py   # Regenerates data/datasets/*
│   ├── datasets/              # Bundled sample datasets (small/medium/large/xlarge)
│   ├── sample/                # Generated sample CSVs (runtime)
│   └── uploads/               # User uploads (runtime)
│
├── validation/                # 9-layer validation stack
│   ├── dataset_validation.py  # Schema, referential integrity
│   ├── ui_validation.py       # Duplicate / missing / outlier checks
│   ├── contact_validation.py  # Self-contact, duration, conflicting records
│   ├── location_validation.py # Unique-visitor vs visit-event, timestamp sanity
│   ├── network_validation.py  # Graph structure viability
│   ├── model_validation.py    # Leakage, class-imbalance, dataset-size checks
│   └── privacy_validation.py  # PII detection
│
├── network/
│   ├── person_graph.py        # Person-person contact graph
│   ├── location_graph.py      # Bipartite person-location graph
│   └── centrality.py          # Degree & betweenness centrality
│
├── analysis/
│   ├── exposure.py            # Unique-case & visit-event metrics
│   ├── hotspot.py             # Hotspot classification
│   └── data_quality.py        # Completeness statistics
│
├── ml/
│   ├── features.py            # Network-derived feature engineering
│   ├── train.py               # Random Forest training & CV
│   ├── predict.py             # Risk prediction
│   └── evaluation.py          # Accuracy/precision/recall/F1/confusion
│
├── visualization/             # Legacy Streamlit plotting helpers
├── utils/                     # Errors, helpers
├── models/                    # Trained model artifacts (runtime)
├── tests/test_core.py         # 31 unit + integration tests
├── requirements.txt
└── README.md
```

---

## 🧠 Analytical Pipeline

```
                 DATA
                  │
          ┌───────┴────────┐
          ▼                ▼
      PEOPLE           LOCATIONS
          │                │
          ▼                ▼
   CONTACT GRAPH     VISIT GRAPH
          │                │
          ▼                ▼
    CENTRALITY        EXPOSURE ANALYSIS
          │                │
          └───────┬────────┘
                  ▼
            FEATURE ENGINE
                  │
                  ▼
           PREDICTION MODEL
                  │
                  ▼
          VALIDATED RESULTS
                  │
                  ▼
       React results dashboard
```

Sizing notes: betweenness is exact up to 1,500 nodes and uses a sampled
Brandes approximation (k=400) above that; analysis results are cached per
dataset so the UI is instant on every interaction after the first run.

---

## ⚠️ Important Safeguards (Domain Rules)

This is an **analytical / educational decision-support prototype**. It must
**not** independently diagnose infection, establish transmission, declare a
location contaminated, or make real-world vaccination/isolation decisions.

```
RULE 1  Network centrality does NOT prove infection.
RULE 2  Network centrality does NOT prove transmission.
RULE 3  A frequently visited location is NOT automatically contaminated.
RULE 4  A model prediction is NOT a medical diagnosis.
RULE 5  Network-based priority is NOT automatically clinical priority.
RULE 6  Every percentage must state its explicit denominator.
RULE 7  Unique people and repeated visit events are counted separately.
RULE 8  Insufficient data produces a warning, not a forced conclusion.
RULE 9  Pseudonymous / de-identified data only (data minimization).
RULE 10 The system explains limitations alongside every important result.
```

All prediction and exposure outputs are framed as **estimates / potential
exposure / case association**, not confirmed outcomes, in both the UI and
generated reports.

---

## 🧪 Testing

The test suite (`tests/test_core.py`, 31 tests) covers:

- Data generation correctness
- Validation logic (schema, referential integrity, no self-loops)
- Contact & location event validation
- ML leakage & class-imbalance checks
- Insufficient-data handling guard
- Graph construction & centrality bounds
- Exposure / hotspot classification
- ML feature shape, no target leakage, model training
- Evaluation metrics & confusion matrix
- Data-quality statistics
- Edge cases (empty contacts, single person)

The Node API also ships `server/e2e.test.mjs`, which starts the server and runs
a full multipart upload through `/api/analyze` end-to-end:

```bash
cd server && node e2e.test.mjs
```

---

## 📦 Python Dependencies

See `requirements.txt`:

```
numpy
pandas
scikit-learn
networkx
plotly
matplotlib
streamlit           # used only by the legacy app.py
fastapi             # not required by the current stack (reserved)
uvicorn
```

---

## 🔒 Privacy

The system enforces **pseudonymous identifiers** (`P001`, `P002`, …) and shows
a privacy notice on the upload screen. Do **not** upload identifiable patient
information (names, phone numbers, addresses, government IDs) unless you are
authorized to process it.