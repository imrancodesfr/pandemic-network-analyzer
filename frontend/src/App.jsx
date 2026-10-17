import { useState } from "react";
import Header from "./components/Header.jsx";
import Landing from "./components/Landing.jsx";
import StepBar from "./components/StepBar.jsx";
import UploadStep from "./components/UploadStep.jsx";
import AnalyzeStep from "./components/AnalyzeStep.jsx";
import OverviewTab from "./components/OverviewTab.jsx";
import ExecutiveTab from "./components/ExecutiveTab.jsx";
import ValidationTab from "./components/ValidationTab.jsx";
import RiskTab from "./components/RiskTab.jsx";
import NetworkTab from "./components/NetworkTab.jsx";
import LocationsTab from "./components/LocationsTab.jsx";
import { analyze, fetchSample } from "./lib/api.js";

const STAGES = [
  { stage: "loading", label: "Loading uploaded datasets" },
  { stage: "validating", label: "Validating dataset structure & required columns" },
  { stage: "network", label: "Building contact network & computing centralities" },
  { stage: "hotspots", label: "Analysing location exposure & identifying hotspots" },
  { stage: "quality", label: "Checking data quality & computed guards" },
  { stage: "model", label: "Building risk features, training model & predicting" },
];

const TABS = [
  { id: "overview", label: "Overview", Component: OverviewTab },
  { id: "executive", label: "Executive Summary", Component: ExecutiveTab },
  { id: "validation", label: "Data Validation", Component: ValidationTab },
  { id: "network", label: "Network Explorer", Component: NetworkTab },
  { id: "locations", label: "Location Hotspots", Component: LocationsTab },
  { id: "risk", label: "Risk Prediction", Component: RiskTab },
];

export default function App() {
  const [view, setView] = useState("landing");
  const [files, setFiles] = useState({});
  const [loadingSample, setLoadingSample] = useState(null);
  const [stages, setStages] = useState([]);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("overview");

  function reset() {
    setView("landing");
    setFiles({});
    setLoadingSample(null);
    setStages([]);
    setError(null);
    setResult(null);
    setTab("overview");
  }

  async function runAnalysis(filesArg = files) {
    setError(null);
    setStages(STAGES.map((s) => ({ ...s, state: "pending" })));
    setView("running");

    const fd = new FormData();
    fd.append("peopleFile", filesArg.people.file, filesArg.people.name);
    fd.append("contactsFile", filesArg.contacts.file, filesArg.contacts.name);
    fd.append("visitsFile", filesArg.visits.file, filesArg.visits.name);
    if (filesArg.locations) fd.append("locationsFile", filesArg.locations.file, filesArg.locations.name);

    try {
      await analyze(fd, {
        onLine: (msg) => {
          if (msg.type === "stage") {
            setStages((prev) =>
              prev.map((s) => {
                let state = "pending";
                const at = STAGES.findIndex((x) => x.stage === msg.stage);
                const my = STAGES.findIndex((x) => x.stage === s.stage);
                if (my < at) state = "done";
                else if (my === at) state = "current";
                return { ...s, state };
              })
            );
          } else if (msg.type === "result") {
            setResult(msg.data);
          }
        },
      });
      // result is set via onLine; give the update a tick to apply before switching view
      setView("results");
    } catch (e) {
      setError(e.message || "Analysis failed.");
    }
  }

  async function runSampleQuick(size) {
    if (loadingSample) return;
    setLoadingSample(size);
    setError(null);
    try {
      const sampleFiles = await fetchSample(size);
      if (!sampleFiles.people) throw new Error("Sample dataset could not be loaded.");
      setFiles(sampleFiles);
      await runAnalysis(sampleFiles);
    } catch (e) {
      setError(e.message || "Sample analysis failed.");
      setView("upload");
    } finally {
      setLoadingSample(null);
    }
  }

  const ActiveTab = TABS.find((t) => t.id === tab)?.Component || OverviewTab;

  if (view === "landing") {
    return (
      <div className="app">
        <Landing onLaunch={() => setView("upload")} onQuickDemo={() => runSampleQuick("small")} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header onReset={reset} />
      <div className="content">
        <StepBar current={view === "results" ? "results" : view === "running" ? "running" : "upload"} />

        {view === "upload" && (
          <UploadStep
            files={files}
            setFiles={setFiles}
            onRun={runAnalysis}
            loadingSample={loadingSample}
            setLoadingSample={setLoadingSample}
            busy={false}
          />
        )}

        {view === "running" && (
          <AnalyzeStep
            stages={view === "running" ? stages : []}
            error={error}
          />
        )}

        {view === "results" && result && (
          <div>
            <div className="hero" style={{ marginBottom: 8 }}>
              <h1>Analysis complete</h1>
              <p className="sub">
                {result.dataset.people.toLocaleString()} people · {result.dataset.contacts.toLocaleString()} contacts ·{" "}
                {result.dataset.visits.toLocaleString()} visits · {result.dataset.cases.toLocaleString()} cases ·
                AUC {result.model.auc.toFixed(3)}. Explore the sections below.
              </p>
            </div>
            <div className="banner ok">{result.guardrails?.banner}</div>
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id ? "active" : ""}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ActiveTab result={result} />
          </div>
        )}

        {view === "results" && !result && (
          <div className="center-note">
            <div className="alert warn">No result available. Go back to uploads and run analysis again.</div>
            <button className="btn primary" onClick={reset}>↺ Start over</button>
          </div>
        )}
      </div>
      <footer className="footer">
        <span>python engine · node api · react ui</span>
        <span>networkx · pandas · scikit-learn · plotly</span>
        <span className="spacer" />
        <span className="muted">Analysis is computed only by the Python pipeline — the UI never approximates results.</span>
      </footer>
    </div>
  );
}