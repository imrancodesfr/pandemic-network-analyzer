import { useMemo, useRef, useState } from "react";
import Plot from "./Plot.jsx";
import { Info, Term, HelpBox } from "./Help.jsx";

const TIER_COLORS = { Low: "#1f9d55", Moderate: "#e8910a", High: "#d8392c" };
const PAGE_SIZE = 200;

const FEATURE_LABELS = {
  degree_centrality: "Degree centrality",
  betweenness_centrality: "Betweenness centrality",
  case_contacts: "Contacts with confirmed cases",
  high_assoc_location_visits: "Visits to high-assoc locations",
};

const FEATURE_TERMS = {
  degree_centrality: "degreeCentrality",
  betweenness_centrality: "betweennessCentrality",
  case_contacts: "caseContacts",
  high_assoc_location_visits: "highAssocVisits",
};

const IMPORTANCE_LABELS = {
  degree_centrality: "Degree (direct contacts)",
  betweenness_centrality: "Betweenness (bridge role)",
  contact_count: "Number of contacts",
  total_duration: "Total contact time",
  locations_visited: "Distinct locations visited",
  total_visits: "Number of visits",
  case_contacts: "Contacts with cases",
  high_assoc_location_visits: "Visits to high-assoc places",
};

export default function RiskTab({ result }) {
  const m = result.model;
  const pred = result.predictions;
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [person, setPerson] = useState("");
  const inspectorRef = useRef(null);

  function inspectPerson(id) {
    setPerson(id);
    // The inspector lives in a card higher up the page; bring it into view
    // so the user gets clear feedback that the row was selected.
    window.setTimeout(() => {
      inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 40);
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pred.records.filter((r) => {
      if (tier !== "all" && r.tier !== tier) return false;
      if (q && !String(r.id).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pred.records, query, tier]);

  const importance = Object.entries(m.feature_importance).sort((a, b) => b[1] - a[1]);
  const cm = m.confusion_matrix;
  const cmText = ["TN", "FP", "FN", "TP"];
  const dist = m.class_distribution || {};
  const n0 = dist["0"] || 0;
  const n1 = dist["1"] || 0;
  const prevalenceTarget = n0 + n1 > 0 ? (n1 / (n0 + n1)) * 100 : 0;

  const selPerson = person ? pred.records.find((r) => r.id === person) : null;
  const sortedForSelect = useMemo(
    () => [...pred.records].sort((a, b) => b.risk - a.risk),
    [pred.records]
  );

  return (
    <div>
      <div className="grid cols-4">
        <div className="metric cyan large"><div className="label">Holdout AUC <Info id="auc" /></div><div className="value">{m.auc.toFixed(3)}</div></div>
        <div className="metric violet"><div className="label">F1 score <Info id="f1" /></div><div className="value">{m.f1.toFixed(3)}</div></div>
        <div className="metric green"><div className="label">Precision / Recall <Info id="precision" /></div><div className="value" style={{ fontSize: 18 }}>{m.precision.toFixed(2)} <span className="unit">/</span> {m.recall.toFixed(2)}</div></div>
        <div className="metric amber"><div className="label">Positive prevalence <Info id="positivePrevalence" /></div><div className="value">{prevalenceTarget.toFixed(1)}<span className="unit">%</span></div></div>
      </div>

      <HelpBox title="What does the risk model tell me?">
        <ul>
          <li>Each person gets a <Term id="riskScore">risk score</Term> (0–100%) — the model's estimate of how likely they are to be a case, based only on <Term id="degreeCentrality">network features</Term>.</li>
          <li><b>AUC / F1 / Precision / Recall</b> describe how accurate that model is. Higher is better; <Term id="auc">AUC</Term> near 0.5 means little better than guessing.</li>
          <li><Term id="positivePrevalence">Positive prevalence</Term> is the case rate in the training data — the baseline the model must beat.</li>
          <li>Risk is a <b>ranking and screening tool</b>, <b>not a medical diagnosis</b>.</li>
        </ul>
      </HelpBox>

      <div className="section-tag">Risk distribution by <Term id="riskTier">tier</Term></div>
      <div className="card">
        <Plot
          height={260}
          data={[
            {
              type: "bar",
              x: Object.keys(pred.summary),
              y: Object.values(pred.summary),
              marker: { color: Object.keys(pred.summary).map((k) => TIER_COLORS[k] || "#0e7f8f") },
              text: Object.values(pred.summary).map(String),
              textposition: "out",
              hovertemplate: "%{x} risk: %{y} people<extra></extra>",
            },
          ]}
          layout={{ showlegend: false, margin: { l: 50, r: 20, t: 30, b: 50 } }}
        />
        <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
          How many people fall into each <Term id="riskTier">risk tier</Term> (Low / Moderate / High). Tiers are bands of the <Term id="riskScore">risk score</Term>, not clinical categories.
        </p>
      </div>

      <div className="section-tag">Individual risk inspector</div>
      <div className="grid cols-2">
        <div className="card" ref={inspectorRef} style={{ scrollMarginTop: 80 }}>
          <h3>Pick a person</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Searchable — {pred.records.length.toLocaleString()} people with predictions, ranked by risk.
          </p>
          <select value={person} onChange={(e) => setPerson(e.target.value)} style={{ width: "100%", minWidth: 240 }}>
            <option value="">— select a person —</option>
            {sortedForSelect.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.tier.toLowerCase()} risk ({Number(r.risk).toFixed(3)})
              </option>
            ))}
          </select>

          {selPerson && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  border: `1px solid ${TIER_COLORS[selPerson.tier] || "#0e7f8f"}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                  textAlign: "center",
                  background: `linear-gradient(180deg, ${TIER_COLORS[selPerson.tier] || "#0e7f8f"}12, transparent)`,
                }}
              >
                <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                  <Term id="riskScore">Predicted risk</Term> · {selPerson.id}
                </div>
                <div className="mono" style={{ fontSize: 42, fontWeight: 750, color: TIER_COLORS[selPerson.tier] || "#0e7f8f", lineHeight: 1.1, margin: "6px 0" }}>
                  {Number(selPerson.risk).toFixed(1)}%
                </div>
                <span className={`status ${selPerson.tier === "High" ? "ERROR" : selPerson.tier === "Moderate" ? "WARNING" : "PASS"}`}>
                  {selPerson.tier} risk
                </span>
              </div>

              <h3 style={{ margin: "20px 0 10px" }}>Key network features</h3>
              <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
                These are the network signals the model used for this person. Higher values generally push risk up.
              </p>
              <table>
                <tbody>
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const val = selPerson.features?.[key];
                    return (
                      <tr key={key}>
                        <td><Term id={FEATURE_TERMS[key]}>{label}</Term></td>
                        <td className="mono" style={{ textAlign: "right", color: "var(--cyan)" }}>
                          {val == null ? "—" : Number(val).toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="muted" style={{ marginBottom: 0, marginTop: 10 }}>
                ⚠ Network-based estimate — does not prove biological infection or active viral shedding.
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h3><Term id="confusionMatrix">Confusion matrix</Term></h3>
            <Plot
              height={300}
              data={[
                {
                  type: "heatmap",
                  z: cm,
                  x: ["Pred. 0 (non-case)", "Pred. 1 (case)"],
                  y: ["Actual 0", "Actual 1"],
                  colorscale: [["0", "#eef1f7"], ["0.5", "#b9d0ea"], ["1", "#f15d22"]],
                  showscale: false,
                  text: cmText,
                  texttemplate: "%{text}: %{z}",
                  hovertemplate: "%{x} / %{y}: %{z}<extra></extra>",
                },
              ]}
              layout={{ title: `Holdout confusion matrix (${m.test_size} records)`, showlegend: false, margin: { l: 70, r: 20, t: 50, b: 60 } }}
            />
            <p className="muted" style={{ marginBottom: 0 }}>
              <b>TP</b> true positives (correctly flagged cases), <b>TN</b> true negatives, <b>FP</b> false alarms, <b>FN</b> missed cases — measured on the <Term id="holdout">holdout</Term> set.
            </p>
          </div>

          <div className="card">
            <h3><Term id="featureImportance">Feature importance</Term></h3>
            <Plot
              height={300}
              data={[
                {
                  type: "bar",
                  orientation: "h",
                  y: importance.map(([k]) => IMPORTANCE_LABELS[k] || k),
                  x: importance.map(([, v]) => v),
                  marker: { color: "#17324f", line: { color: "#5a7197", width: 0.6 } },
                  hovertemplate: "%{y}: %{x:.4f}<extra></extra>",
                },
              ]}
              layout={{ showlegend: false, margin: { l: 190, r: 20, t: 20, b: 40 }, xaxis: { zeroline: false, gridcolor: "#e8ecf5" } }}
            />
            <p className="muted" style={{ marginBottom: 0 }}>
              Longer bar = the model relies on that signal more. <Term id="cvF1">Cross-validated F1</Term> {m.cv_f1_mean.toFixed(3)} ± {m.cv_f1_std.toFixed(3)}; <Term id="targetLeakage">leakage</Term>: none detected.
            </p>
          </div>
        </div>
      </div>

      <div className="section-tag">Predictions explorer</div>
      <div className="card">
        <div className="searchbar">
          <input
            placeholder="Search person ID (e.g. P103)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">Risk: all</option>
            <option value="High">Risk: High</option>
            <option value="Moderate">Risk: Moderate</option>
            <option value="Low">Risk: Low</option>
          </select>
          {person && (
            <span className="muted" style={{ color: "var(--brand-dark)" }}>
              inspecting <b>{person}</b>
            </span>
          )}
          <span className="spacer" />
          <span className="muted">{rows.length.toLocaleString()} matching</span>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>#</th><th>Person</th><th>Predicted risk</th><th>Risk tier</th><th>View</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, PAGE_SIZE).map((r, i) => (
                <tr key={r.id} className={person === r.id ? "row-selected" : ""}>
                  <td style={{ color: "var(--dim)" }}>{i + 1}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{r.id}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{Number(r.risk).toFixed(4)}</td>
                  <td>
                    <span className={`status ${r.tier === "High" ? "ERROR" : r.tier === "Moderate" ? "WARNING" : "PASS"}`} style={{ fontSize: 10 }}>
                      {r.tier}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn small ${person === r.id ? "primary" : ""}`}
                      onClick={() => inspectPerson(r.id)}
                    >
                      inspect →
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="muted">No predictions match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Showing {Math.min(PAGE_SIZE, rows.length).toLocaleString()} of {rows.length.toLocaleString()} matching records.
        </p>
      </div>
    </div>
  );
}