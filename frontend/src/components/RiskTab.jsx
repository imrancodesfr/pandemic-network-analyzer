import { useMemo, useState } from "react";
import Plot from "./Plot.jsx";

const TIER_COLORS = { Low: "#22c55e", Moderate: "#f59e0b", High: "#ef4444" };
const PAGE_SIZE = 200;

export default function RiskTab({ result }) {
  const m = result.model;
  const pred = result.predictions;
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pred.records.filter((r) => {
      if (tier !== "all" && r.tier !== tier) return false;
      if (q && !String(r.id).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pred.records, query, tier]);

  const shown = rows.slice(0, PAGE_SIZE);
  const tiers = pred.summary;

  const importance = Object.entries(m.feature_importance).sort((a, b) => b[1] - a[1]);
  const cm = m.confusion_matrix;
  const cmLabels = ["True Neg", "False Pos", "False Neg", "True Pos"];
  const cmText = cm.flatMap((row, i) => row.map((v, j) => cmLabels[i * 2 + j])).filter(Boolean);

  return (
    <div>
      <div className="grid cols-3">
        <div className="metric cyan"><div className="label">Holdout AUC</div><div className="value">{m.auc.toFixed(3)}</div></div>
        <div className="metric blue"><div className="label">F1 score</div><div className="value">{m.f1.toFixed(3)}</div></div>
        <div className="metric"><div className="label">Precision / Recall</div><div className="value">{m.precision.toFixed(2)}{" / "}{m.recall.toFixed(2)}</div></div>
      </div>

      <div className="section-tag">Risk distribution</div>
      <div className="card">
        <Plot
          height={280}
          data={[
            {
              type: "bar",
              x: Object.keys(tiers),
              y: Object.values(tiers),
              marker: { color: Object.keys(tiers).map((k) => TIER_COLORS[k] || "#4cd7f6") },
              text: Object.values(tiers).map(String),
              textposition: "out",
            },
          ]}
          layout={{ title: "People by predicted risk tier", showlegend: false }}
        />
      </div>

      <div className="section-tag">Model performance</div>
      <div className="grid cols-2">
        <div className="card">
          <h3>Confusion matrix (holdout test set)</h3>
          <Plot
            height={320}
            data={[
              {
                type: "heatmap",
                z: cm,
                x: ["Predicted 0", "Predicted 1"],
                y: ["Actual 0", "Actual 1"],
                colorscale: [["0", "#12203a"], ["0.5", "#1d3a5f"], ["1", "#06b6d4"]],
                showscale: false,
                text: cmText,
                hovertemplate: "%{x} / %{y}<br>%{z}<extra></extra>",
              },
            ]}
            layout={{ title: `Test set: ${m.test_size} records`, showlegend: false, margin: { l: 60, r: 20, t: 50, b: 60 } }}
          />
        </div>
        <div className="card">
          <h3>Feature importance</h3>
          <Plot
            height={320}
            data={[
              {
                type: "bar",
                orientation: "h",
                y: importance.map(([k]) => k),
                x: importance.map(([, v]) => v),
                marker: { color: "#4cd7f6" },
              },
            ]}
            layout={{ title: "Random Forest importances", showlegend: false, margin: { l: 180, r: 20, t: 50, b: 40 } }}
          />
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
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Person</th><th>Predicted risk</th><th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: "var(--dim)" }}>{i + 1}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{r.id}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{Number(r.risk).toFixed(4)}</td>
                  <td>
                    <span className={`status ${r.tier === "High" ? "ERROR" : r.tier === "Moderate" ? "WARNING" : "PASS"}`}
                      style={{ fontSize: 10 }}>
                      {r.tier}
                    </span>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={4} className="muted">No predictions match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Showing {shown.length.toLocaleString()} of {rows.length.toLocaleString()} matching predictions.
          {rows.length > PAGE_SIZE ? ` First ${PAGE_SIZE} shown.` : ""}
        </p>
      </div>
    </div>
  );
}