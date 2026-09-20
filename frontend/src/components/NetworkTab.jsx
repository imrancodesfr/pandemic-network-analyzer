import { useMemo, useState } from "react";
import Plot from "./Plot.jsx";
import { pct } from "../lib/utils.js";

const FILTERS = [
  { id: "25", label: "Top 25 hubs" },
  { id: "50", label: "Top 50 hubs" },
  { id: "all", label: "All nodes" },
];

// Lightweight Fruchterman–Reingold for small subsets; circular for large sets.
function layoutGraph(nodeIds, edges, degreeMap) {
  const n = nodeIds.length;
  const index = {};
  nodeIds.forEach((id, i) => (index[id] = i));

  const x = new Array(n);
  const y = new Array(n);
  const order = [...nodeIds].sort((a, b) => (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0));
  if (n <= 1) {
    x[0] = 0; y[0] = 0;
    return { x, y };
  }

  // seed on circle, hubs first
  order.forEach((id, i) => {
    const a = (i / n) * 2 * Math.PI;
    x[index[id]] = Math.cos(a);
    y[index[id]] = Math.sin(a);
  });

  if (n <= 60) {
    const iters = 90;
    const k = 1.4;
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
      if (index[u] == null || index[v] == null) continue;
      adj[index[u]].push(index[v]);
      adj[index[v]].push(index[u]);
    }
    for (let iter = 0; iter < iters; iter += 1) {
      const temp = 0.12 * (1 - iter / iters);
      const dx = new Array(n).fill(0);
      const dy = new Array(n).fill(0);
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          let rx = x[i] - x[j];
          let ry = y[i] - y[j];
          let dist = Math.sqrt(rx * rx + ry * ry) || 0.01;
          let f = (k * k) / dist;
          rx /= dist; ry /= dist;
          dx[i] += rx * f; dy[i] += ry * f;
          dx[j] -= rx * f; dy[j] -= ry * f;
        }
      }
      for (let i = 0; i < n; i += 1) {
        for (const j of adj[i]) {
          if (j <= i) continue;
          const rx = x[i] - x[j];
          const ry = y[i] - y[j];
          const dist = Math.sqrt(rx * rx + ry * ry) || 0.01;
          const f = (dist * dist) / k;
          let ux = rx / dist, uy = ry / dist;
          if (ux === 0 && uy === 0) { ux = 1; uy = 0; }
          dx[i] -= ux * f; dy[i] -= uy * f;
          dx[j] += ux * f; dy[j] += uy * f;
        }
      }
      for (let i = 0; i < n; i += 1) {
        x[i] += dx[i] * temp;
        y[i] += dy[i] * temp;
      }
    }
  }

  // normalize to [-1,1] square
  let minX = Math.min(...x), maxX = Math.max(...x);
  let minY = Math.min(...y), maxY = Math.max(...y);
  const sx = maxX - minX || 1;
  const sy = maxY - minY || 1;
  const s = Math.max(sx, sy);
  for (let i = 0; i < n; i += 1) {
    x[i] = ((x[i] - (minX + maxX) / 2) / s) * 2;
    y[i] = ((y[i] - (minY + maxY) / 2) / s) * 2;
  }
  return { x, y };
}

const STATUS_COLOR = {
  Confirmed: "#ef4444",
  Suspected: "#f59e0b",
  Recovered: "#22c55e",
  Not_Identified: "#bcc9cd",
  Unknown: "#8494a0",
};

export default function NetworkTab({ result }) {
  const [filter, setFilter] = useState("25");
  const [selected, setSelected] = useState("");
  const maxNodes = filter === "all" ? Infinity : Number(filter);

  const { nodes, edges, degreeMap, btwMap, statusMap } = useMemo(() => {
    const deg = new Map(result.nodes.map((n) => [n.id, n.degree]));
    const btw = new Map(result.nodes.map((n) => [n.id, n.betweenness]));
    const st = new Map(result.nodes.map((n) => [n.id, n.status]));
    const sorted = [...result.nodes].sort((a, b) => b.degree - a.degree);
    return { nodes: sorted, edges: result.edges, degreeMap: deg, btwMap: btw, statusMap: st };
  }, [result]);

  const subset = useMemo(() => {
    const subNodes = nodes.slice(0, maxNodes);
    const ids = new Set(subNodes.map((n) => n.id));
    const subEdges = edges.filter(([a, b]) => ids.has(a) && ids.has(b));
    return { subNodes, subEdges };
  }, [nodes, edges, maxNodes]);

  const { x, y } = useMemo(
    () => layoutGraph(subset.subNodes.map((n) => n.id), subset.subEdges, degreeMap),
    [subset]
  );

  const edgeTraces = useMemo(() => {
    const idToPos = {};
    subset.subNodes.forEach((n, i) => (idToPos[n.id] = [x[i], y[i]]));
    const ex = [], ey = [];
    for (const [a, b] of subset.subEdges) {
      const pa = idToPos[a], pb = idToPos[b];
      if (!pa || !pb) continue;
      ex.push(pa[0], pb[0], null);
      ey.push(pa[1], pb[1], null);
    }
    return [
      {
        type: "scattergl",
        mode: "lines",
        x: ex,
        y: ey,
        line: { width: 0.5, color: "#3d494c" },
        hoverinfo: "skip",
      },
    ];
  }, [subset, x, y]);

  const nodeTrace = useMemo(() => {
    const topHubs = new Set(subset.subNodes.slice(0, 12).map((n) => n.id));
    return {
      type: "scattergl",
      mode: "markers",
      x,
      y,
      customdata: subset.subNodes.map((n) => [
        n.id, n.degree, n.betweenness, n.status,
      ]),
      text: subset.subNodes.map((n) => {
        const val = Number(n.degree).toFixed(3);
        return topHubs.has(n.id) ? n.id : "";
      }),
      textposition: "top center",
      hovertemplate:
        "<b>%{customdata[0]}</b><br>Degree: %{customdata[1]:.3f}<br>Betweenness: %{customdata[2]:.3f}<br>Status: %{customdata[3]}<extra></extra>",
      textfont: { size: 9, color: "#dde2f8" },
      marker: {
        size: subset.subNodes.map((n) => Math.min(20, 6 + n.degree * 90)),
        color: subset.subNodes.map((n) => n.betweenness),
        colorscale: "Viridis",
        cmin: 0,
        cmax: Math.max(0.01, ...subset.subNodes.map((n) => n.betweenness)),
        showscale: true,
        colorbar: { title: "Betweenness", thickness: 10, len: 0.6, outlinecolor: "#3d494c" },
        line: { width: 1, color: "#0d1322" },
      },
    };
  }, [subset, x, y]);

  const selNode = selected ? nodes.find((n) => n.id === selected) : null;
  const selectedTrace = selNode
    ? {
        type: "scattergl",
        mode: "markers",
        x: [x[subset.subNodes.findIndex((n) => n.id === selected)] ?? undefined],
        y: [y[subset.subNodes.findIndex((n) => n.id === selected)] ?? undefined],
        marker: { size: 26, color: "#4cd7f6", symbol: "circle-open", line: { width: 3, color: "#4cd7f6" } },
        hoverinfo: "skip",
      }
    : null;

  const exposureTop = useMemo(
    () => result.exposure.slice(0, 15),
    [result.exposure]
  );

  const classificationColor = {
    "High Association": "#ef4444",
    "Moderate Association": "#f59e0b",
    "Low Association": "#22c55e",
    "Insufficient Data": "#8494a0",
  };

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span className="muted" style={{ marginRight: 4 }}>Show:</span>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`btn ${filter === f.id ? "primary" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <span className="spacer" />
          <label className="muted" htmlFor="net-inspector">
            <b>Node inspector</b>
          </label>
          <select
            id="net-inspector"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ background: "var(--bg0)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 4, padding: "7px 10px", minWidth: 200 }}
          >
            <option value="">— select a person —</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id} (deg {Number(n.degree).toFixed(3)})
              </option>
            ))}
          </select>
        </div>

        <Plot
          height={540}
          data={[...edgeTraces, nodeTrace, ...(selectedTrace ? [selectedTrace] : [])]}
          layout={{
            title: `Contact network — ${subset.subNodes.length.toLocaleString()} nodes / ${subset.subEdges.length.toLocaleString()} edges`,
            showlegend: false,
            xaxis: { showgrid: false, zeroline: false, showticklabels: false },
            yaxis: { showgrid: false, zeroline: false, showticklabels: false },
            margin: { l: 10, r: 10, t: 50, b: 10 },
          }}
        />

        {selNode && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>
              {selNode.id}
              <span className={`status ${selNode.status === "Confirmed" ? "ERROR" : "PASS"}`} style={{ marginLeft: 10 }}>
                {selNode.status}
              </span>
            </h3>
            <div className="grid cols-3" style={{ marginBottom: 0 }}>
              <div><span className="muted">Degree centrality</span><div className="mono" style={{ fontSize: 16 }}>{selNode.degree.toFixed(4)}</div></div>
              <div><span className="muted">Betweenness centrality</span><div className="mono" style={{ fontSize: 16 }}>{selNode.betweenness.toFixed(4)}</div></div>
              <div><span className="muted">Contact status</span><div className="mono" style={{ fontSize: 16 }}>{degConnected(selNode.id, subset.subEdges) > 0 ? "connected" : "isolated"}</div></div>
            </div>
          </div>
        )}

        <p className="muted" style={{ marginBottom: 0 }}>
          Node color = betweenness centrality (Viridis); node size = degree centrality.
          {result.graph.total_people > 1500
            ? " Betweenness for large networks uses a sampled Brandes approximation (k=400)."
            : ""}
        </p>
      </div>

      <div className="section-tag">Location exposure</div>
      <div className="grid cols-2">
        <div className="card">
          <h3>Case-visitor share by location (top 15)</h3>
          <Plot
            height={380}
            data={[
              {
                type: "bar",
                x: exposureTop.map((e) => e.location_id),
                y: exposureTop.map((e) => e.case_visitor_pct),
                marker: {
                  color: exposureTop.map((e) => classificationColor[e.classification] || "#8494a0"),
                },
                hovertemplate: "%{x}<br>%{y:.1%} case visitors<extra></extra>",
              },
            ]}
            layout={{
              title: "Unique case visitors / total identified cases",
              showlegend: false,
              margin: { l: 60, r: 20, t: 50, b: 90 },
              yaxis: { tickformat: ".0%" },
              xaxis: { tickangle: -45 },
            }}
          />
        </div>

        <div className="card">
          <h3>Classification legend</h3>
          {Object.entries(classificationColor).map(([k, c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0" }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: c, display: "inline-block" }} />
              <span>{k}</span>
            </div>
          ))}
          <p className="muted">
            Thresholds (Rule 5): {"≥30%"} case-visitor share = high association, {"≥15%"} = moderate.
            Locales with fewer than 10 unique visitors are flagged as insufficient data.
          </p>
        </div>
      </div>

      <div className="section-tag">Hotspot detail — all locations</div>
      <div className="card">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Location</th><th>Unique visitors</th><th>Visit events</th>
                <th>Case visitors</th><th>Case share</th><th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {result.exposure.map((e) => (
                <tr key={e.location_id}>
                  <td style={{ fontFamily: "var(--mono)" }}>{e.location_id}</td>
                  <td>{e.unique_visitors}</td>
                  <td>{e.total_visits}</td>
                  <td>{e.unique_case_visitors}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{pct(e.case_visitor_pct)}</td>
                  <td>
                    <span className={`status ${e.classification === "High Association" ? "ERROR" : e.classification === "Moderate Association" ? "WARNING" : e.classification === "Low Association" ? "PASS" : "WARNING"}`}
                      style={{ fontSize: 10 }}>
                      {e.classification}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function degConnected(id, edges) {
    return edges.some(([a, b]) => a === id || b === id);
  }
}