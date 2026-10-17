import { useState } from "react";
import Plot from "./Plot.jsx";
import { pct } from "../lib/utils.js";
import { Info, Term, HelpBox } from "./Help.jsx";

function Metric({ label, value, delta, tone, large, id }) {
  return (
    <div className={`metric ${tone || ""} ${large ? "large" : ""}`}>
      <div className="label">{label} {id && <Info id={id} />}</div>
      <div className="value">{value} {delta && <span className="unit" style={{ fontSize: 12, marginLeft: 2 }}>{delta}</span>}</div>
    </div>
  );
}

export default function ExecutiveTab({ result }) {
  const d = result.dataset;
  const g = result.graph;
  const hs = result.hotspot_summary;
  const m = result.model;
  const pred = result.predictions;
  const topHub = result.top_degree?.[0];
  const topBridge = result.top_betweenness?.[0];
  const topLoc = result.exposure?.[0];

  const highRisk = pred.summary?.High || 0;
  const moderateRisk = pred.summary?.Moderate || 0;
  const lowRisk = pred.summary?.Low || 0;
  const prevalence =
    d.people > 0 ? (d.cases / d.people) * 100 : 0;

  const roster = [];
  if (result.top_degree) {
    for (const [pid, score] of result.top_degree.slice(0, 5)) {
      roster.push({ entity: pid, role: "Hub", metric: `deg ${score.toFixed(3)}`, action: "Voluntary rapid kit / contact tracing" });
    }
  }
  if (result.top_betweenness) {
    for (const [pid, score] of result.top_betweenness.slice(0, 3)) {
      roster.push({ entity: pid, role: "Bridge", metric: `btw ${score.toFixed(3)}`, action: "Pre-exposure advisory" });
    }
  }
  if (topLoc) {
    roster.push({
      entity: topLoc.location_id,
      role: "Hotspot",
      metric: `${(topLoc.case_visitor_pct * 100).toFixed(0)}% assoc`,
      action: "Environmental decontamination",
    });
  }

  return (
    <div>
      <div className="grid cols-5">
        <Metric id="people" label="Population" value={d.people.toLocaleString()} tone="cyan" />
        <Metric id="cases" label="Identified cases" value={d.cases.toLocaleString()} delta={`${prevalence.toFixed(1)}% prevalence`} tone="amber" />
        <Metric id="contacts" label="Contact events" value={d.contacts.toLocaleString()} tone="green" />
        <Metric id="hotspotsFlagged" label="Potential hotspots" value={hs.high_association + hs.moderate_association} delta={`${hs.high_association} high / ${hs.moderate_association} mod`} tone="red" />
        <Metric id="auc" label="Model AUC" value={m.auc.toFixed(3)} tone="violet" />
        <Metric id="degreeCentrality" label="Top hub" value={topHub ? topHub[0] : "—"} delta={topHub ? `deg ${topHub[1].toFixed(3)}` : ""} tone="cyan" />
        <Metric id="betweennessCentrality" label="Top bridge" value={topBridge ? topBridge[0] : "—"} delta={topBridge ? `btw ${topBridge[1].toFixed(3)}` : ""} tone="violet" />
      </div>

      <HelpBox title="Executive summary — how to read">
        <ul>
          <li><b>Population, cases, contacts</b> — the size and mixing of the cohort.</li>
          <li><b>Potential hotspots</b> — locations with high/moderate <Term id="caseShare">case association</Term> (Rule 5).</li>
          <li><b>Top hub / Top bridge</b> — the <Term id="hub">most connected person</Term> and the <Term id="bridge">key connector</Term>.</li>
          <li><b>Model AUC</b> — how well the <Term id="randomForest">model</Term> separates cases from non-cases (not a medical diagnosis).</li>
        </ul>
      </HelpBox>

      <div className="section-tag">Multi-domain intelligence synthesis</div>
      <div className="grid cols-3">
        <div className="synth cyan">
          <div className="kicker">NETWORK STRUCTURE</div>
          <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, margin: "8px 0 4px" }}>
            <Term id="giantComponent">Giant component</Term> reach
          </p>
          <p style={{ fontSize: 12.5, color: "var(--mut)", margin: 0 }}>
            {pct(g.giant_component_pct)} of individuals reside in the giant connected
            component — {g.isolated_nodes} people are isolated (no recorded contacts).
          </p>
          <div className="row">Dominant hub: <span className="val">{topHub ? topHub[0] : "—"}</span> (k = {topHub ? topHub[1].toFixed(3) : "—"})</div>
          <div className="row">Critical bridge: <span className="val">{topBridge ? topBridge[0] : "—"}</span> (B = {topBridge ? topBridge[1].toFixed(3) : "—"})</div>
        </div>

        <div className="synth amber">
          <div className="kicker">LOCATION EXPOSURE</div>
          <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, margin: "8px 0 4px" }}>
            <Term id="hotspotsFlagged">Bipartite hotspots</Term>
          </p>
          <p style={{ fontSize: 12.5, color: "var(--mut)", margin: 0 }}>
            {hs.total_locations} locations analysed. {hs.high_association + hs.moderate_association} flagged
            from unique case-visitor exposure (<Term id="rule5">Rule 5 thresholds</Term>: ≥30% high, ≥15% moderate).
          </p>
          <div className="row">Top site: <span className="val">{topLoc ? topLoc.location_id : "—"}</span></div>
          <div className="row">Case association: <span className="val">{topLoc ? pct(topLoc.case_visitor_pct) : "—"}</span> of case cohort</div>
        </div>

        <div className="synth violet">
          <div className="kicker">PREDICTIVE INFERENCE</div>
          <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, margin: "8px 0 4px" }}>
            <Term id="randomForest">Supervised model</Term>
          </p>
          <p style={{ fontSize: 12.5, color: "var(--mut)", margin: 0 }}>
            Trained on {m.train_size} records, held out {m.test_size} for evaluation (<Term id="holdout">holdout</Term>). <Term id="targetLeakage">Zero verified target leakage</Term>.
          </p>
          <div className="row">Recall / Precision: <span className="val">{pct(m.recall)} / {pct(m.precision, 0)}</span></div>
          <div className="row">Holdout AUC: <span className="val">{m.auc.toFixed(3)}</span> · CV F1 {m.cv_f1_mean.toFixed(3)} ± {m.cv_f1_std.toFixed(3)}</div>
          <div className="row">High risk cohort: <span className="val" style={{ color: "var(--red)" }}>{highRisk} pts</span> · Moderate {moderateRisk} · Low {lowRisk}</div>
        </div>
      </div>

      <div className="section-tag">Risk tier composition (<Term id="riskTier">Low / Moderate / High</Term>)</div>
      <div className="card">
        <Plot
          height={250}
          data={[
            {
              type: "pie",
              labels: ["Low", "Moderate", "High"],
              values: [lowRisk, moderateRisk, highRisk],
              hole: 0.62,
              sort: false,
              textinfo: "label+value",
              textfont: { color: "#4e5f7d" },
              marker: { colors: ["#1f9d55", "#e8910a", "#d8392c"], line: { color: "#ffffff", width: 2 } },
              hovertemplate: "%{label}: %{value} people (%{percent})<extra></extra>",
            },
          ]}
          layout={{ showlegend: false, margin: { l: 20, r: 20, t: 10, b: 10 } }}
        />
      </div>

      <div className="section-tag">Resource allocation simulation</div>
      <div className="alert warn" style={{ marginTop: 12 }}>
        ⚠ SIMULATION ONLY — network-based prioritization does not equal clinical or medical priority (Rule 5).
      </div>
      <div className="card">
        <SimSlider label="Rapid test kits" total={200} defaultValue={150} target="top degree hubs" tone="cyan" />
        <SimSlider label="Prophylaxis doses" total={100} defaultValue={75} target="betweenness bridge nodes" tone="violet" />
      </div>

      <HelpBox title="How the target roster is built">
        <ul>
          <li><b>Hub</b> = top <Term id="hub">degree hubs</Term> (most direct contacts). Metric shown is degree (<code>deg</code>).</li>
          <li><b>Bridge</b> = top <Term id="bridge">betweenness bridges</Term> (people connecting separate groups). Metric shown is betweenness (<code>btw</code>).</li>
          <li><b>Hotspot</b> = the highest-<Term id="caseShare">case-share</Term> location. Metric shown is case-visitor share (<code>% assoc</code>).</li>
          <li>Suggested interventions are voluntary, non-punitive actions (testing, decontamination) — never mandatory isolation.</li>
        </ul>
      </HelpBox>
      <div className="card">
        <h3>Prioritized target roster</h3>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Entity</th><th>Role</th><th>Metric</th><th>Suggested intervention</th></tr>
            </thead>
            <tbody>
              {roster.map((r, i) => (
                <tr key={`${r.entity}-${i}`}>
                  <td style={{ fontFamily: "var(--mono)" }}>{r.entity}</td>
                  <td>
                    <span className={`status ${r.role === "Hotspot" ? "WARNING" : "PASS"}`} style={{ fontSize: 10 }}>{r.role}</span>
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>{r.metric}</td>
                  <td>{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-tag">Section 38 explainability summary</div>
      <details className="section38" open>
        <summary>1 · What was found?</summary>
        <p>
          Consolidated synthesis of {d.people.toLocaleString()} individuals across {hs.total_locations} locations,
          with {d.cases} verified cases, {d.contacts.toLocaleString()} contact relationships and
          a {pct(g.giant_component_pct)} giant component.
        </p>
      </details>
      <details className="section38">
        <summary>2 · How was it calculated?</summary>
        <p>
          Integrated NetworkX centrality scoring + bipartite co-location exposure matrices +
          supervised Random Forest classification (100 trees, depth 10, balanced class weights).
        </p>
      </details>
      <details className="section38">
        <summary>3 · What does it NOT prove?</summary>
        <p>
          It does not establish biological transmission causation or active infectivity. High centrality reflects
          interaction geometry, not clinical pathogenicity. Predictions are not medical diagnoses (Rule 4).
        </p>
      </details>
      <details className="section38">
        <summary>4 · Recommended action</summary>
        <p>
          Deploy voluntary, decentralized testing toward high-degree clusters; schedule environmental decontamination
          for top hotspots; avoid punitive isolation measures.
        </p>
      </details>
    </div>
  );
}

function SimSlider({ label, total, defaultValue, target, tone }) {
  const [value, setValue] = useState(defaultValue);
  const pctFilled = (value / total) * 100;
  return (
    <div className="slider-row">
      <div className="cap">
        <span style={{ color: "var(--text)", fontWeight: 600, fontFamily: "var(--mono)" }}>{label}</span>
        <span style={{ color: "var(--cyan)", fontWeight: 700, fontFamily: "var(--mono)" }}>
          {value} / {total}
        </span>
      </div>
      <input type="range" min={0} max={total} value={value} onChange={(e) => setValue(Number(e.target.value))} />
      <div className="bar-track" style={{ marginTop: 8 }}>
        <div className="bar-fill" style={{ width: `${pctFilled}%` }} />
      </div>
      <div style={{ marginTop: 6, fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>
        {pctFilled.toFixed(0)}% of capacity · targeted at {target}
      </div>
    </div>
  );
}