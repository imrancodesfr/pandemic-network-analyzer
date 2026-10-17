# 🔬 Pandemic Network Analyzer

A **network-analysis and machine-learning decision-support system** that models
recorded person-to-person contacts and person-to-location exposure data to
identify structurally important individuals, potential exposure hotspots, and
model-based risk patterns during an outbreak scenario.

Built as a three-tier stack:

| Tier | Tech | Responsibility |
|------|------|----------------|
| **UI** | React · Vite · Plotly.js | Landing page, upload flow, live analysis progress, dashboard & explorer, inline plain-language help |
| **API** | Node.js · Express | File intake, spawns the Python engine, streams progress as NDJSON |
| **Engine** | Python · NetworkX · Pandas · Scikit-learn | **All** analysis & ML — never approximated in the UI |

Every metric, chart and term in the UI is explained in plain language via
hover/tap tooltips and "how to read this" panels — no analyst background needed.

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

1. **Start on the landing page** — a SolarWinds-style splash with an animated
   network preview, feature highlights and guardrails. Use **Launch app** to
   open the workflow, or **Try a sample** to jump straight into a one-click
   analysis. (The logo in the header always returns here.)
2. **Try a sample instantly** — four bundled datasets (`small` / `medium` /
   `large` / `xlarge`) as cards, each with **use** (load & review) and
   **▶ analyze** (one-click load + run) buttons.
3. **Or upload your own data** — drag your CSVs into the drop zone. Roles
   (`people` / `contacts` / `visits` / `locations`) are detected automatically
   from the columns. Each file shows a status row: role, size, row estimate,
   and its columns with required ones highlighted.
4. **Run Analysis** — the button is disabled until `people`, `contacts` and
   `visits` are all present. You decide when to start — nothing runs silently.
5. **Watch progress** — 6 live stages stream from the Python engine
   (`loading → validating → network → hotspots → quality → model`).
6. **Explore results** — six tabs, with hover/tap help everywhere (see
   [Plain-Language Help](#-plain-language-help)):

| Tab | Contents |
|-----|----------|
| **Overview** | KPI strip, cohort status donut, giant-component gauge, data-quality scorecard, hub charts, model snapshot |
| **Executive Summary** | 7 KPI row, multi-domain intelligence synthesis cards, risk-tie composition, resource-allocation simulation with sliders + prioritized roster, Section 38 explainability |
| **Data Validation** | 9-layer validation registry with PASS/WARNING/ERROR chips + validation-health bar |
| **Network Explorer** | Animated contact graph (Live traffic pulses along contacts) with Top 25/50 / Giant component / All views, **ego-network focus** when you pick a person, WebGL rendering with automatic 2D fallback, a numerically **stable force layout** (every view renders with finite, non-overlapping coordinates), readable node hover, searchable node inspector, network structure stats |
| **Location Hotspots** | Location leaderboard with filters, per-location inspector (case visitors vs visitors chart), case-visitor distribution |
| **Risk Prediction** | RF metrics, confusion matrix, feature importance, **individual risk inspector** (big risk % + key features), searchable predictions explorer with **inspect →** that scrolls to and highlights the chosen person |

---

## 🧭 Plain-Language Help

The whole UI is self-explaining so a non-analyst can interpret every number:

- **Hover tips** — an orange **ⓘ** icon or a dotted-underline term reveals a
  short "what it is" plus "how to read it" explanation. Tooltips auto-flip
  above/below the pointer and stay inside the viewport.
- **"How to read this" panels** — collapsible `<HelpBox>` blocks sit beside
  every chart (e.g. *How to read this graph*, the data-quality scorecard, the
  guardrail rules).
- **Single source of truth** — all definitions live in one glossary
  (`frontend/src/lib/glossary.js`) and are rendered by reusable `Info` /
  `Term` / `HelpBox` components (`frontend/src/components/Help.jsx`), so
  wording stays consistent across tabs.

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
│   │   ├── App.jsx            # Landing page + 3-step flow: upload -> analyze -> results
│   │   ├── lib/
│   │   │   ├── api.js         # API client (sample + analyze)
│   │   │   ├── utils.js       # CSV parsing, role detection, validation grouping
│   │   │   └── glossary.js    # Plain-language definitions for every metric/term
│   │   └── components/        # Upload/analyze steps + 6 result tabs + Plotly wrapper
│   │       ├── Landing.jsx    # SolarWinds-style splash page
│   │       ├── Help.jsx       # <Info> / <Term> / <HelpBox> hover-help primitives
│   │       └── …              # Overview/Executive/Validation/Network/Locations/Risk tabs
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

---

## 📝 Changelog

### UI
- **Network Explorer layout stability.** The small-graph force layout now uses a
  displacement-capped Fruchterman–Reingold relaxation (cooling-based per-node
  movement cap and a guarded repulsion term) instead of an unbounded
  relaxation. Every view—Top 25 hubs, Top 50 hubs, giant component and
  all—now produces finite, stable coordinates. Previously the high-degree hub
  views could diverge to non-finite positions and render as a blank graph.