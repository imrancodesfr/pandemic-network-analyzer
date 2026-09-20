import { useState } from "react";
import Header from "./components/Header.jsx";
import StepBar from "./components/StepBar.jsx";
import UploadStep from "./components/UploadStep.jsx";
import AnalyzeStep from "./components/AnalyzeStep.jsx";
import OverviewTab from "./components/OverviewTab.jsx";
import ValidationTab from "./components/ValidationTab.jsx";
import RiskTab from "./components/RiskTab.jsx";
import NetworkTab from "./components/NetworkTab.jsx";
import { analyze } from "./lib/api.js";

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
  { id: "validation", label: "Data Validation", Component: ValidationTab },
  { id: "risk", label: "Risk Prediction", Component: RiskTab },
  { id: "network", label: "Network Explorer", Component: NetworkTab },
];

export default function App() {
  const [view, setView] = useState("upload");
  const [files, setFiles] = useState({});
  const [loadingSample, setLoadingSample] = useState(null);
  const [stages, setStages] = useState([]);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("overview");

  function reset() {
    setView("upload");
    setFiles({});
    setLoadingSample(null);
    setStages([]);
    setError(null);
    setResult(null);
    setTab("overview");
  }

  async function runAnalysis() {
    setError(null);
    setStages(STAGES.map((s) => ({ ...s, state: "pending" })));
    setView("running");

    const fd = new FormData();
    fd.append("peopleFile", files.people.file, files.people.name);
    fd.append("contactsFile", files.contacts.file, files.contacts.name);
    fd.append("visitsFile", files.visits.file, files.visits.name);
    if (files.locations) fd.append("locationsFile", files.locations.file, files.locations.name);

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

  const ActiveTab = TABS.find((t) => t.id === tab)?.Component || OverviewTab;

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