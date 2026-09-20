import Plot from "./Plot.jsx";
import { pct } from "../lib/utils.js";

function Metric({ label, value, unit, tone }) {
  return (
    <div className={`metric ${tone || ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value} {unit && <span className="unit">{unit}</span>}</div>
    </div>
  );
}

export default function OverviewTab({ result }) {
  const d = result.dataset;
  const q = result.data_quality;
  const g = result.graph;
  const hs = result.hotspot_summary;
  const m = result.model;

  const hubList = (list, label) => (
    <table>
      <thead>
        <tr><th>#</th><th>Person</th><th>{label}</th></tr>
      </thead>
      <tbody>
        {list.slice(0, 10).map(([id, v], i) => (
          <tr key={id}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: "var(--mono)" }}>{id}</td>
            <td>{v.toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="grid cols-4">
        <Metric label="People" value={d.people.toLocaleString()} tone="cyan" />
        <Metric label="Contact events" value={d.contacts.toLocaleString()} tone="green" />
        <Metric label="Visit events" value={d.visits.toLocaleString()} tone="green" />
        <Metric label="Locations" value={d.locations.toLocaleString()} tone="cyan" />
        <Metric label="Identified cases" value={d.cases.toLocaleString()} tone="amber" />
        <Metric label="High-assoc hotspots" value={hs.high_association} tone="red" />
        <Metric label="Model AUC" value={m.auc.toFixed(3)} tone="cyan" />
        <Metric label="Highest risk score" value={result.predictions.highest_risk ? result.predictions.highest_risk.risk.toFixed(3) : "—"} tone="amber" />
      </div>

      <div className="section-tag">Dataset snapshot</div>
      <div className="grid cols-3">
        <div className="card">
          <h3>Data quality</h3>
          <table>
            <tbody>
              <tr><td>Completeness</td><td style={{ fontFamily: "var(--mono)" }}>{pct(q.completeness)}</td></tr>
              <tr><td>Clean records</td><td style={{ fontFamily: "var(--mono)" }}>{q.clean_records?.toLocaleString()} / {q.total_records?.toLocaleString()}</td></tr>
              <tr><td>Missing values</td><td style={{ fontFamily: "var(--mono)" }}>{q.missing_values}</td></tr>
              <tr><td>Duplicate records</td><td style={{ fontFamily: "var(--mono)" }}>{q.duplicate_records}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Contact graph</h3>
          <table>
            <tbody>
              <tr><td>People in network</td><td style={{ fontFamily: "var(--mono)" }}>{g.total_people}</td></tr>
              <tr><td>Unique contact edges</td><td style={{ fontFamily: "var(--mono)" }}>{g.total_edges}</td></tr>
              <tr><td>Connected components</td><td style={{ fontFamily: "var(--mono)" }}>{g.connected_components}</td></tr>
              <tr><td>Giant component</td><td style={{ fontFamily: "var(--mono)" }}>{g.giant_component_size} ({pct(g.giant_component_pct)})</td></tr>
              <tr><td>Density</td><td style={{ fontFamily: "var(--mono)" }}>{g.density.toFixed(4)}</td></tr>
              <tr><td>Isolated nodes</td><td style={{ fontFamily: "var(--mono)" }}>{g.isolated_nodes}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Hotspot summary</h3>
          <table>
            <tbody>
              <tr><td>High association</td><td style={{ fontFamily: "var(--mono)", color: "var(--red)" }}>{hs.high_association}</td></tr>
              <tr><td>Moderate association</td><td style={{ fontFamily: "var(--mono)", color: "var(--amber)" }}>{hs.moderate_association}</td></tr>
              <tr><td>Low association</td><td style={{ fontFamily: "var(--mono)", color: "var(--dim)" }}>{hs.low_association}</td></tr>
              <tr><td>Insufficient data</td><td style={{ fontFamily: "var(--mono)", color: "var(--dim)" }}>{hs.insufficient_data}</td></tr>
              <tr><td>Locations analysed</td><td style={{ fontFamily: "var(--mono)" }}>{hs.total_locations}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-tag">Status mix</div>
      <div className="card">
        <Plot
          height={300}
          data={[
            {
              type: "bar",
              x: Object.entries(d.status_counts).map(([k]) => k),
              y: Object.entries(d.status_counts).map(([, v]) => v),
              marker: { color: "#4cd7f6" },
              text: Object.values(d.status_counts).map(String),
              textposition: "out",
            },
          ]}
          layout={{ title: "People by infection status", showlegend: false }}
        />
      </div>

      <div className="section-tag">Network hubs</div>
      <div className="grid cols-2">
        <div className="card">
          <h3>Top degree centrality</h3>
          {hubList(result.top_degree, "Degree")}
        </div>
        <div className="card">
          <h3>Top betweenness (bridges)</h3>
          {hubList(result.top_betweenness, "Betweenness")}
        </div>
      </div>

      <div className="section-tag">Model snapshot</div>
      <div className="card">
        <div className="grid cols-4" style={{ marginBottom: 14 }}>
          <Metric label="Accuracy" value={m.accuracy.toFixed(3)} />
          <Metric label="Precision" value={m.precision.toFixed(3)} />
          <Metric label="Recall" value={m.recall.toFixed(3)} />
          <Metric label="F1" value={m.f1.toFixed(3)} />
          <Metric label="CV F1 (mean)" value={m.cv_f1_mean.toFixed(3)} />
          <Metric label="Train / test" value={`${m.train_size}/${m.test_size}`} />
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Random Forest (100 trees, depth 10, balanced class weights). Holdout AUC {m.auc.toFixed(3)}.
          Features: degree, betweenness, contact count, total duration, locations visited, total visits,
          case contacts, high-association-location visits. Predictions are <b>not</b> medical diagnoses.
        </p>
      </div>
    </div>
  );
}