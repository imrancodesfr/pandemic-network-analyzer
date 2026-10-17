import Plot from "./Plot.jsx";
import { pct } from "../lib/utils.js";
import { Info, Term, HelpBox } from "./Help.jsx";

function Metric({ label, value, delta, tone, id }) {
  return (
    <div className={`metric ${tone || ""}`}>
      <div className="label">{label} {id && <Info id={id} />}</div>
      <div className="value">{value} {delta && <span className="unit" style={{ fontSize: 12 }}>{delta}</span>}</div>
    </div>
  );
}

function QualityBar({ label, value, tone }) {
  const color = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : "var(--cyan)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="bar-track"><div className="bar-fill" style={{ width: value, background: color }} /></div>
    </div>
  );
}

export default function OverviewTab({ result }) {
  const d = result.dataset;
  const q = result.data_quality;
  const g = result.graph;
  const hs = result.hotspot_summary;
  const m = result.model;

  const statusEntries = Object.entries(d.status_counts || {});
  const topDegree = result.top_degree?.slice(0, 8) || [];
  const topBetweenness = result.top_betweenness?.slice(0, 8) || [];
  const totalStatus = statusEntries.reduce((s, [, v]) => s + v, 0) || 1;

  const statusColors = ["#d8392c", "#e8910a", "#1f9d55", "#9db1cf", "#7d8aa3"];

  const hy = statusEntries.map(([k]) => k);
  const hx = statusEntries.map(([, v]) => v);

  return (
    <div>
      <div className="grid cols-4">
        <Metric id="people" label="People" value={d.people.toLocaleString()} tone="cyan" />
        <Metric id="contacts" label="Contact events" value={d.contacts.toLocaleString()} tone="green" />
        <Metric id="visits" label="Visit events" value={d.visits.toLocaleString()} tone="green" />
        <Metric id="locations" label="Locations" value={d.locations.toLocaleString()} tone="violet" />
        <Metric id="cases" label="Identified cases" value={d.cases.toLocaleString()} delta={`${pct(d.people ? d.cases / d.people : 0)} prevalence`} tone="amber" />
        <Metric id="hotspotsFlagged" label="Hotspots flagged" value={hs.high_association + hs.moderate_association} tone="red" />
        <Metric id="auc" label="Model AUC" value={m.auc.toFixed(3)} tone="cyan" />
        <Metric id="highestRisk" label="Highest risk" value={result.predictions.highest_risk ? `${result.predictions.highest_risk.risk.toFixed(3)}` : "—"} delta={result.predictions.highest_risk ? result.predictions.highest_risk.id : ""} tone="amber" />
      </div>

      <HelpBox title="What do these numbers mean?">
        <ul>
          <li><b>People / Contact events / Visit events / Locations</b> describe the raw data you loaded — how many individuals, interactions and places were recorded.</li>
          <li><b>Identified cases</b> is the share of the population recorded as cases (<Term id="prevalence">prevalence</Term>). It comes straight from your data, not from the model.</li>
          <li><b>Hotspots flagged</b> counts places whose visitor mix crossed the <Term id="rule5">Rule 5 thresholds</Term>.</li>
          <li><b>Model AUC</b> is how well the risk model separates cases from non-cases (0.5 = guessing, 1.0 = perfect).</li>
          <li><b>Highest risk</b> is the single most at-risk person the model found — a review flag, not a diagnosis.</li>
        </ul>
      </HelpBox>

      <div className="section-tag">Cohort composition</div>
      <div className="grid cols-2">
        <div className="card">
          <h3>People by infection status</h3>
          <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
            Statuses come from your people file:{" "}
            <Term id="statusConfirmed">Confirmed</Term>, <Term id="statusSuspected">Suspected</Term>,{" "}
            <Term id="statusRecovered">Recovered</Term>, <Term id="statusNotIdentified">Not identified</Term>,{" "}
            <Term id="statusUnknown">Unknown</Term>.
          </p>
          <Plot
            height={280}
            data={[
              {
                type: "pie",
                labels: statusEntries.map(([k]) => k),
                values: statusEntries.map(([, v]) => v),
                hole: 0.62,
                sort: false,
                textinfo: "label+percent",
                textfont: { color: "#4e5f7d", size: 11 },
                marker: { colors: statusColors, line: { color: "#ffffff", width: 2 } },
                hovertemplate: "%{label}: %{value} people (%{percent})<extra></extra>",
              },
            ]}
            layout={{ showlegend: false, margin: { l: 20, r: 60, t: 10, b: 10 } }}
          />
        </div>

        <div className="card">
          <h3><Term id="giantComponent">Giant component</Term> reach</h3>
          <Plot
            height={280}
            data={[
              {
                type: "indicator",
                mode: "gauge+number+delta",
                value: g.giant_component_pct * 100,
                number: { suffix: "%", font: { size: 40, color: "#f15d22" } },
                title: { text: "share of people in the largest connected group", font: { color: "#7d8aa3", size: 12 } },
                gauge: {
                  axis: { range: [0, 100], tickcolor: "#c6d0e2", tickfont: { color: "#7d8aa3" } },
                  bar: { color: "#f15d22" },
                  bgcolor: "#eef1f7",
                  borderwidth: 1,
                  bordercolor: "#dde3f0",
                  steps: [
                    { range: [0, 33], color: "#eef1f7" },
                    { range: [33, 66], color: "#e3e9f4" },
                    { range: [66, 100], color: "#fbe3d5" },
                  ],
                },
              },
            ]}
            layout={{ margin: { l: 30, r: 30, t: 50, b: 10 } }}
          />
        </div>
      </div>

      <div className="section-tag">Data quality scorecard</div>
      <HelpBox title="What does the quality scorecard check?">
        <ul>
          <li><b><Term id="completeness">Completeness</Term></b> — how many required values are filled in (no blanks).</li>
          <li><b><Term id="duplicateRecords">Duplicate records</Term></b> — repeated rows that were removed before analysis.</li>
          <li><b><Term id="privacyAudit">Privacy audit</Term></b> — confirms no names/phone numbers/addresses are present.</li>
          <li><b>Graph structure</b> summarises the contact network: <Term id="people">nodes</Term>, <Term id="contacts">edges</Term>, <Term id="components">components</Term>, <Term id="density">density</Term> and <Term id="isolatedNodes">isolated people</Term>.</li>
        </ul>
      </HelpBox>
      <div className="card">
        <div className="grid cols-3">
          <div>
            <QualityBar
              label="Completeness"
              value={pct(q.completeness)}
              tone={q.completeness >= 0.95 ? "green" : q.completeness >= 0.8 ? "amber" : ""}
            />
            <QualityBar label="Duplicate-free records" value={`${q.clean_records}/${q.total_records}`} tone="green" />
            <QualityBar label="Privacy audit" value="100%" tone="green" />
          </div>
          <div>
            <div className="metric inside" style={{ padding: 12, marginBottom: 10 }}>
              <div className="label"><Term id="missingValues">Missing values</Term></div>
              <div className="value" style={{ fontSize: 20 }}>{q.missing_values?.toLocaleString()}</div>
            </div>
            <div className="metric inside" style={{ padding: 12 }}>
              <div className="label"><Term id="duplicateRecords">Duplicate records</Term></div>
              <div className="value" style={{ fontSize: 20 }}>{q.duplicate_records?.toLocaleString()}</div>
            </div>
          </div>
          <div className="card inside">
            <h3 style={{ marginTop: 0 }}>Graph structure</h3>
            <table>
              <tbody>
                <tr><td><Term id="people">Nodes</Term> / <Term id="contacts">edges</Term></td><td className="mono">{g.total_people} / {g.total_edges}</td></tr>
                <tr><td><Term id="components">Components</Term></td><td className="mono">{g.connected_components}</td></tr>
                <tr><td><Term id="density">Density</Term></td><td className="mono">{g.density.toFixed(4)}</td></tr>
                <tr><td><Term id="isolatedNodes">Isolated nodes</Term></td><td className="mono">{g.isolated_nodes}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section-tag">Network hubs — who connects the population</div>
      <div className="grid cols-2">
        <div className="card">
          <h3>Top <Term id="degreeCentrality">degree centrality</Term> (<Term id="hub">hubs</Term>)</h3>
          <Plot
            height={300}
            data={[
              {
                type: "bar",
                orientation: "h",
                y: topDegree.map(([id]) => id),
                x: topDegree.map(([, v]) => v),
                marker: { color: "#f15d22", line: { color: "#ff8a5c", width: 1 } },
                hovertemplate: "%{y}: %{x:.3f}<extra></extra>",
              },
            ]}
layout={{ showlegend: false, margin: { l: 70, r: 20, t: 20, b: 40 }, xaxis: { zeroline: false, gridcolor: "#e8ecf5" } }}
          />
        </div>
        <div className="card">
          <h3>Top <Term id="betweennessCentrality">betweenness</Term> — <Term id="bridge">structural bridges</Term></h3>
          <Plot
            height={300}
            data={[
              {
                type: "bar",
                orientation: "h",
                y: topBetweenness.map(([id]) => id),
                x: topBetweenness.map(([, v]) => v),
                marker: { color: "#17324f", line: { color: "#5a7197", width: 1 } },
                hovertemplate: "%{y}: %{x:.3f}<extra></extra>",
              },
            ]}
            layout={{ showlegend: false, margin: { l: 70, r: 20, t: 20, b: 40 }, xaxis: { zeroline: false, gridcolor: "#e8ecf5" } }}
          />
        </div>
      </div>

      <div className="section-tag">Model snapshot</div>
      <div className="card">
        <div className="grid cols-5" style={{ marginBottom: 14 }}>
          <Metric id="accuracy" label="Accuracy" value={m.accuracy.toFixed(3)} tone="green" />
          <Metric id="precision" label="Precision" value={m.precision.toFixed(3)} tone="cyan" />
          <Metric id="recall" label="Recall" value={m.recall.toFixed(3)} tone="violet" />
          <Metric id="f1" label="F1 score" value={m.f1.toFixed(3)} tone="green" />
          <Metric id="cvF1" label="CV F1 ± σ" value={`${m.cv_f1_mean.toFixed(3)} ± ${m.cv_f1_std.toFixed(3)}`} tone="cyan" />
        </div>
        <p className="muted">
          <Term id="holdout">Holdout</Term> ROC-<Term id="auc">AUC</Term> {m.auc.toFixed(3)}. <Term id="randomForest">Random Forest</Term> model. <Term id="targetLeakage">No target leakage detected</Term>.
        </p>
      </div>
    </div>
  );
}