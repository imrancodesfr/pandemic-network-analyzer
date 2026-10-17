import { useMemo, useState } from "react";
import Plot from "./Plot.jsx";
import { pct } from "../lib/utils.js";
import { Info, Term, HelpBox } from "./Help.jsx";

const CLASS_COLOR = {
  "High Association": "#d8392c",
  "Moderate Association": "#e8910a",
  "Low Association": "#1f9d55",
  "Insufficient Data": "#7d8aa3",
};

const CLASS_TERM = {
  "High Association": "highAssociation",
  "Moderate Association": "moderateAssociation",
  "Low Association": "lowAssociation",
  "Insufficient Data": "insufficientData",
};

function Metric({ label, value, delta, tone, id }) {
  return (
    <div className={`metric ${tone || ""}`}>
      <div className="label">{label} {id && <Info id={id} />}</div>
      <div className="value">{value} {delta && <span className="unit" style={{ fontSize: 12 }}>{delta}</span>}</div>
    </div>
  );
}

export default function LocationsTab({ result }) {
  const hs = result.hotspot_summary;
  const cases = result.dataset.cases;
  const [classFilter, setClassFilter] = useState("all");

  const rows = useMemo(() => {
    const list = classFilter === "all"
      ? result.exposure
      : result.exposure.filter((e) => e.classification === classFilter);
    return [...list].sort((a, b) => b.case_visitor_pct - a.case_visitor_pct);
  }, [result.exposure, classFilter]);

  const [selectedId, setSelectedId] = useState("");
  const selected = useMemo(
    () => result.exposure.find((e) => e.location_id === selectedId) || (rows[0] || null),
    [selectedId, rows]
  );

  const distribute = useMemo(() => result.exposure.slice(0, 25), [result.exposure]);

  return (
    <div>
      <div className="grid cols-4">
        <Metric id="locations" label="Locations analysed" value={hs.total_locations} tone="cyan" />
        <Metric id="hotspotsFlagged" label="Hotspots flagged" value={hs.high_association + hs.moderate_association} delta={`${hs.high_association} high / ${hs.moderate_association} mod`} tone="red" />
        <Metric id="cases" label="Identified cases" value={cases.toLocaleString()} tone="amber" />
        <Metric id="insufficientData" label="Insufficient data" value={hs.insufficient_data} tone="pink" />
      </div>

      <div className="section-tag">Location hotspot leaderboard</div>
      <HelpBox title="How are locations ranked?">
        <ul>
          <li><b><Term id="uniqueVisitors">Unique visitors</Term></b> — distinct people who visited the place.</li>
          <li><b><Term id="uniqueCaseVisitors">Case visitors</Term></b> — distinct identified cases who visited it.</li>
          <li><b><Term id="caseShare">Case share</Term></b> — case visitors ÷ the whole case cohort (<Term id="rule6">Rule 6</Term>). This is what drives the ranking.</li>
          <li><b><Term id="highAssociation">High association</Term></b> ≥30% · <Term id="moderateAssociation">Moderate</Term> ≥15% (<Term id="rule5">Rule 5</Term>). A high share means many cases passed through — an association, not proof of contamination.</li>
          <li><b><Term id="insufficientData">Insufficient data</Term></b> — too few visits to score reliably; treat with caution.</li>
        </ul>
      </HelpBox>
      <div className="card">
        <div className="searchbar">
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">Classification: all</option>
            <option value="High Association">Classification: high</option>
            <option value="Moderate Association">Classification: moderate</option>
            <option value="Low Association">Classification: low</option>
            <option value="Insufficient Data">Classification: insufficient data</option>
          </select>
          <span className="spacer" />
          <label className="muted" htmlFor="loc-select" style={{ whiteSpace: "nowrap" }}><b>Location inspector</b></label>
          <select
            id="loc-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ minWidth: 170 }}
          >
            <option value="">— pick a location —</option>
            {result.exposure.map((e) => (
              <option key={e.location_id} value={e.location_id}>{e.location_id}</option>
            ))}
          </select>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Location</th><th>Unique visitors</th><th>Visit events</th>
                <th>Case visitors</th><th>Case share</th><th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.location_id} onClick={() => setSelectedId(e.location_id)} style={{ cursor: "pointer" }}>
                  <td style={{ color: "var(--dim)" }}>{i + 1}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{e.location_id}</td>
                  <td>{e.unique_visitors}</td>
                  <td>{e.total_visits}</td>
                  <td>{e.unique_case_visitors}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{pct(e.case_visitor_pct)}</td>
                  <td>
                    <span className={`status ${e.classification === "High Association" ? "ERROR" : e.classification === "Moderate Association" ? "WARNING" : e.classification === "Low Association" ? "PASS" : "WARNING"}`} style={{ fontSize: 10 }}>
                      {e.classification}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="muted">No locations match this classification.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <>
          <div className="section-tag">Location inspector — {selected.location_id}</div>
          <div className="grid cols-5">
            <Metric id="uniqueCaseVisitors" label="Unique case visitors" value={selected.unique_case_visitors} tone="red" />
            <Metric id="caseShare" label="Case cohort share" value={pct(selected.case_visitor_pct)} delta="of identified cases" tone="amber" />
            <Metric id="uniqueVisitors" label="Total visitors" value={selected.unique_visitors} tone="cyan" />
            <Metric id="visits" label="Visit events" value={selected.total_visits} tone="cyan" />
            <Metric
              id={CLASS_TERM[selected.classification]}
              label="Classification"
              value={selected.classification.split(" ")[0]}
              delta={selected.classification.split(" ").slice(1).join(" ")}
              tone="pink"
            />
          </div>
          <div className="card">
            <h3>Case visitors vs. all visitors — {selected.location_id}</h3>
            <Plot
              height={300}
              data={[
                {
                  type: "bar",
                  x: ["Unique visitors", "Case visitors"],
                  y: [selected.unique_visitors, selected.unique_case_visitors],
                  marker: { color: ["#0e7f8f", "#d8392c"] },
                  text: [selected.unique_visitors, selected.unique_case_visitors],
                  textposition: "out",
                  hovertemplate: "%{x}: %{y}<extra></extra>",
                },
              ]}
              layout={{ showlegend: false, margin: { l: 60, r: 20, t: 30, b: 40 } }}
            />
            <p className="muted" style={{ marginBottom: 0 }}>
              <Term id="rule6">Rule 6</Term> — the share is computed against the identified-case cohort ({cases}), not all visitors, so it stays interpretable across datasets.
            </p>
          </div>
        </>
      )}

      <div className="section-tag">Case-visitor distribution across locations (top 25)</div>
      <div className="card">
        <Plot
          height={360}
          data={[
            {
              type: "bar",
              x: distribute.map((e) => e.location_id),
              y: distribute.map((e) => e.case_visitor_pct),
              marker: { color: distribute.map((e) => CLASS_COLOR[e.classification] || "#7d8aa3") },
              hovertemplate: "%{x}<br>%{y:.1%} case visitors<extra></extra>",
            },
          ]}
          layout={{
            title: "Unique case visitors / identified cases",
            showlegend: false,
            margin: { l: 60, r: 20, t: 50, b: 110 },
            yaxis: { tickformat: ".0%" },
            xaxis: { tickangle: -55 },
          }}
        />
        <div className="muted" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
          {Object.entries(CLASS_COLOR).map(([k, c]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }} />
              <Term id={CLASS_TERM[k]}>{k}</Term>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}