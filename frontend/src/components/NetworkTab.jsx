import { useEffect, useMemo, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import { pct } from "../lib/utils.js";
import { Info, Term, HelpBox } from "./Help.jsx";

const FILTERS = [
  { id: "25", label: "Top 25 hubs" },
  { id: "50", label: "Top 50 hubs" },
  { id: "giant", label: "Giant component" },
  { id: "all", label: "All nodes" },
];

const STATUS_COLOR = {
  Confirmed: "#d8392c",
  Suspected: "#e8910a",
  Recovered: "#1f9d55",
  Not_Identified: "#9db1cf",
  Unknown: "#7d8aa3",
};

function layoutGraph(nodeIds, edges, degreeMap, centerId) {
  const n = nodeIds.length;
  const index = {};
  nodeIds.forEach((id, i) => (index[id] = i));

  const x = new Array(n);
  const y = new Array(n);

  if (n <= 1) {
    for (let i = 0; i < n; i++) { x[i] = 0; y[i] = 0; }
    return { x, y };
  }

  // Star layout for a focused person: them in the centre, contacts on a ring.
  if (centerId && index[centerId] != null) {
    const ci = index[centerId];
    x[ci] = 0; y[ci] = 0;
    const others = nodeIds.map((id, i) => [id, i]).filter(([, i]) => i !== ci);
    others.sort((a, b) => (degreeMap.get(b[0]) || 0) - (degreeMap.get(a[0]) || 0));
    const m = others.length || 1;
    others.forEach(([, i], k) => {
      const a = (k / m) * 2 * Math.PI;
      x[i] = Math.cos(a);
      y[i] = Math.sin(a);
    });
    return { x, y };
  }

  const order = [...nodeIds].sort((a, b) => (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0));
  order.forEach((id, i) => {
    const a = (i / n) * 2 * Math.PI;
    x[index[id]] = Math.cos(a);
    y[index[id]] = Math.sin(a);
  });

  if (n <= 60) {
    const iters = 120;
    const k = Math.max(0.35, Math.sqrt(2 / n) * 1.6);
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
      if (index[u] == null || index[v] == null) continue;
      adj[index[u]].push(index[v]);
      adj[index[v]].push(index[u]);
    }
    for (let iter = 0; iter < iters; iter += 1) {
      const cooling = 1 - iter / iters;
      const dx = new Array(n).fill(0);
      const dy = new Array(n).fill(0);
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          let rx = x[i] - x[j];
          let ry = y[i] - y[j];
          let d2 = rx * rx + ry * ry;
          if (d2 < 1e-8) { rx = (i % 2 ? 1 : -1) * 1e-3; ry = (j % 2 ? 1 : -1) * 1e-3; d2 = rx * rx + ry * ry; }
          const d = Math.sqrt(d2);
          const f = (k * k) / d;
          const ux = rx / d, uy = ry / d;
          dx[i] += ux * f; dy[i] += uy * f;
          dx[j] -= ux * f; dy[j] -= uy * f;
        }
      }
      for (let i = 0; i < n; i += 1) {
        for (const j of adj[i]) {
          if (j <= i) continue;
          let rx = x[i] - x[j];
          let ry = y[i] - y[j];
          let d2 = rx * rx + ry * ry;
          if (d2 < 1e-8) { rx = 1e-3; ry = 0; d2 = rx * rx; }
          const d = Math.sqrt(d2);
          const f = (d * d) / k;
          const ux = rx / d, uy = ry / d;
          dx[i] -= ux * f; dy[i] -= uy * f;
          dx[j] += ux * f; dy[j] += uy * f;
        }
      }
      for (let i = 0; i < n; i += 1) {
        // Cap each node's movement per iteration so repulsion can never explode.
        const cap = 0.25 * cooling + 0.02;
        const disp = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1e-9;
        const scale = Math.min(1, cap / disp);
        x[i] += dx[i] * scale;
        y[i] += dy[i] * scale;
      }
    }
  }

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

function largestComponent(nodes, edges) {
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const [a, b] of edges) {
    if (adj.has(a) && adj.has(b)) {
      adj.get(a).push(b);
      adj.get(b).push(a);
    }
  }
  let best = [];
  const seen = new Set();
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    const stack = [n.id];
    seen.add(n.id);
    const comp = [];
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const nxt of adj.get(cur) || []) {
        if (!seen.has(nxt)) { seen.add(nxt); stack.push(nxt); }
      }
    }
    if (comp.length > best.length) best = comp;
  }
  const set = new Set(best);
  return { ids: best, edges: edges.filter(([a, b]) => set.has(a) && set.has(b)) };
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function NetworkChart({ subNodes, subEdges, x, y, idToPos, live, selected, totalPeople }) {
  const ref = useRef(null);
  const graphRef = useRef(null);
  const libRef = useRef([]);
  const rafRef = useRef(0);
  const liveRef = useRef(live);
  liveRef.current = live;
  const gl = useMemo(hasWebGL, []);
  const traceType = gl ? "scattergl" : "scatter";

  const maxDeg = useMemo(() => Math.max(...subNodes.map((n) => n.degree), 1e-9), [subNodes]);
  const nPeople = Math.max(2, totalPeople || subNodes.length);

  const base = useMemo(() => {
    const ex = [], ey = [];
    for (const [a, b] of subEdges) {
      const pa = idToPos[a], pb = idToPos[b];
      if (!pa || !pb) continue;
      ex.push(pa[0], pb[0], null);
      ey.push(pa[1], pb[1], null);
    }
    const edgeTrace = {
      type: traceType, mode: "lines", x: ex, y: ey,
      line: { width: 0.7, color: "rgba(112, 128, 168, 0.35)" },
      hoverinfo: "skip",
    };
    const nodeTrace = {
      type: traceType, mode: "markers", x, y,
      customdata: subNodes.map((n) => [
        n.id,
        Math.round(n.degree * (nPeople - 1)),
        n.betweenness,
        n.status,
        n.status === "Confirmed" || n.status === "Suspected" ? "case" : "non-case",
      ]),
      text: subNodes.map((n, i) => (i < 10 || n.id === selected ? n.id : "")),
      textposition: "top center",
      hovertemplate:
        "<b>%{customdata[0]}</b>  ·  %{customdata[3]} (%{customdata[4]})<br>" +
        "Direct contacts: <b>%{customdata[1]}</b><br>" +
        "Bridge score: <b>%{customdata[2]:.3f}</b><br>" +
        "<span style='color:#7d8aa3'>Hover a bigger, bluer dot = more connected</span>" +
        "<extra></extra>",
      textfont: { size: 10, color: "#22334f" },
      marker: {
        // normalise against the CURRENT subset's max degree so hubs are visible
        size: subNodes.map((n) => 7 + (n.degree / maxDeg) * (n.id === selected ? 30 : 20)),
        color: subNodes.map((n) => n.betweenness),
        colorscale: "Blues",
        cmin: 0,
        cmax: Math.max(1e-9, ...subNodes.map((n) => n.betweenness)),
        showscale: true,
        colorbar: { title: { text: "Bridge<br>score", side: "right" }, thickness: 11, len: 0.6, outlinecolor: "#d5dcea", tickfont: { color: "#7d8aa3" } },
        line: {
          width: subNodes.map((n) => (n.id === selected ? 3 : 1)),
          color: subNodes.map((n) => (n.id === selected ? "#f15d22" : "#ffffff")),
        },
      },
    };
    const pulseTrace = {
      type: traceType, mode: "markers", x: [], y: [],
      marker: { size: 5, color: "#f15d22", line: { color: "#ffffff", width: 1 }, opacity: 0.95 },
      hoverinfo: "skip",
    };
    return [edgeTrace, nodeTrace, pulseTrace];
  }, [subNodes, subEdges, x, y, idToPos, selected, maxDeg, traceType, nPeople]);

  const pulseLib = useMemo(() => {
    const list = [];
    for (const [a, b] of subEdges) {
      if (list.length >= 160) break;
      const pa = idToPos[a], pb = idToPos[b];
      if (!pa || !pb) continue;
      list.push({ sx: pa[0], sy: pa[1], tx: pb[0], ty: pb[1], spd: 0.5 + Math.random() * 1.1, phase: Math.random() });
    }
    return list;
  }, [subEdges, idToPos]);

  const layout = useMemo(
    () => ({
      title: { text: `Contact network — ${subNodes.length.toLocaleString()} nodes / ${subEdges.length.toLocaleString()} edges`, font: { size: 14 } },
      showlegend: false,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      xaxis: { showgrid: false, zeroline: false, showticklabels: false, fixedrange: true },
      yaxis: { showgrid: false, zeroline: false, showticklabels: false, fixedrange: true },
      margin: { l: 12, r: 12, t: 56, b: 12 },
      hovermode: "closest",
      dragmode: false,
      hoverlabel: { bgcolor: "#ffffff", bordercolor: "#dde3f0", font: { color: "#22334f", size: 12, family: "Inter, sans-serif" } },
    }),
    [subNodes, subEdges]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    Plotly.react(el, base, layout, { responsive: true, displayModeBar: false });
    graphRef.current = el;
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (el._fullLayout) Plotly.purge(el);
    };
  }, [base, layout]);

  useEffect(() => {
    libRef.current = pulseLib;
    if (!live) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
      const el = graphRef.current;
      if (el && el._fullLayout) Plotly.restyle(el, { x: [[]], y: [[]] }, [2]);
      return;
    }
    const tick = () => {
      const el = graphRef.current;
      const lib = libRef.current;
      if (!liveRef.current || !el || !el._fullLayout || !lib.length) { rafRef.current = 0; return; }
      const t = performance.now() / 12;
      const xs = [], ys = [];
      for (const p of lib) {
        const f = (t * p.spd + p.phase) % 1;
        xs.push(p.sx + (p.tx - p.sx) * f);
        ys.push(p.sy + (p.ty - p.sy) * f);
      }
      Plotly.restyle(el, { x: [xs], y: [ys] }, [2]);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; } };
  }, [live, pulseLib]);

  return (
    <div>
      <div ref={ref} style={{ width: "100%", height: 560 }} />
      {!gl && (
        <p className="muted" style={{ margin: "8px 0 0" }}>
          WebGL unavailable in this browser — using the SVG renderer. The animation still runs, just at a lower frame rate.
        </p>
      )}
    </div>
  );
}

export default function NetworkTab({ result }) {
  const [filter, setFilter] = useState("25");
  const [selected, setSelected] = useState("");
  const [live, setLive] = useState(true);

  const { nodes, edges, degreeMap, btwMap, statusMap, nodeById } = useMemo(() => {
    const deg = new Map(result.nodes.map((n) => [n.id, n.degree]));
    const btw = new Map(result.nodes.map((n) => [n.id, n.betweenness]));
    const st = new Map(result.nodes.map((n) => [n.id, n.status]));
    const sorted = [...result.nodes].sort((a, b) => b.degree - a.degree);
    return { nodes: sorted, edges: result.edges, degreeMap: deg, btwMap: btw, statusMap: st, nodeById: new Map(result.nodes.map((n) => [n.id, n])) };
  }, [result]);

  const subset = useMemo(() => {
    // Focusing a person shows their ego network: them + direct contacts.
    if (selected) {
      const nb = new Set([selected]);
      for (const [a, b] of edges) {
        if (a === selected) nb.add(b);
        else if (b === selected) nb.add(a);
      }
      const subNodes = nodes.filter((n) => nb.has(n.id));
      const subEdges = edges.filter(([a, b]) => nb.has(a) && nb.has(b));
      return { subNodes, subEdges, mode: "focus" };
    }
    if (filter === "giant") {
      const giant = largestComponent(result.nodes, result.edges);
      // If the giant component is basically the whole graph, keep the view readable
      // by taking its top hubs rather than dumping a hairball.
      const CAP = 150;
      let ids = giant.ids;
      let capped = false;
      if (ids.length > CAP) {
        ids = [...ids]
          .sort((a, b) => (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0))
          .slice(0, CAP);
        capped = true;
      }
      const keep = new Set(ids);
      const subNodes = ids.map((id) => nodeById.get(id)).filter(Boolean);
      const subEdges = giant.edges.filter(([a, b]) => keep.has(a) && keep.has(b));
      return { subNodes, subEdges, mode: capped ? "giant-capped" : "giant" };
    }
    const maxNodes = filter === "all" ? Infinity : Number(filter);
    const subNodes = nodes.slice(0, maxNodes);
    const ids = new Set(subNodes.map((n) => n.id));
    const subEdges = edges.filter(([a, b]) => ids.has(a) && ids.has(b));
    return { subNodes, subEdges, mode: "top" };
  }, [nodes, edges, filter, result, nodeById, degreeMap, selected]);

  const { x, y } = useMemo(
    () => layoutGraph(subset.subNodes.map((n) => n.id), subset.subEdges, degreeMap, selected || null),
    [subset, degreeMap, selected]
  );

  const idToPos = useMemo(() => {
    const map = {};
    subset.subNodes.forEach((n, i) => (map[n.id] = [x[i], y[i]]));
    return map;
  }, [subset, x, y]);

  const selNode = selected ? nodeById.get(selected) || null : null;

  const exposureCounts = useMemo(() => {
    const counts = { "High Association": 0, "Moderate Association": 0, "Low Association": 0, "Insufficient Data": 0 };
    for (const e of result.exposure) counts[e.classification] = (counts[e.classification] || 0) + 1;
    return counts;
  }, [result.exposure]);

  return (
    <div>
      <div className="grid cols-5">
        <div className="metric cyan"><div className="label">Nodes (people) <Info id="people" /></div><div className="value">{result.graph.total_people.toLocaleString()}</div></div>
        <div className="metric green"><div className="label">Edges (contacts) <Info id="contacts" /></div><div className="value">{result.graph.total_edges.toLocaleString()}</div></div>
        <div className="metric violet"><div className="label">Components <Info id="components" /></div><div className="value">{result.graph.connected_components}</div></div>
        <div className="metric amber"><div className="label">Giant component <Info id="giantComponent" /></div><div className="value">{pct(result.graph.giant_component_pct)}</div></div>
        <div className="metric red"><div className="label">Isolated nodes <Info id="isolatedNodes" /></div><div className="value">{result.graph.isolated_nodes}</div></div>
      </div>

      <div className="section-tag">Interactive network graph</div>

      <HelpBox title="How to read this graph" open>
        <ul>
          <li><b>Each dot is a person</b>; each grey line is a recorded contact between two people.</li>
          <li><b>Dot size</b> = number of direct contacts (<Term id="degreeCentrality">degree centrality</Term>). Bigger dot = more connected → a <Term id="hub">hub</Term>.</li>
          <li><b>Dot colour</b> = <Term id="betweennessCentrality">betweenness centrality</Term> (the "bridge score"). Darker blue = the person links otherwise separate groups.</li>
          <li><b>Hover any dot</b> to see that person's status, number of direct contacts, and bridge score.</li>
          <li><b>Orange pulses</b> are <Term id="liveTraffic">live traffic</Term> — a visual cue for contact flow, not real-time tracking.</li>
        </ul>
      </HelpBox>

      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <span className="muted" style={{ marginRight: 4 }}>Show:</span>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`btn small ${filter === f.id && !selected ? "primary" : ""}`}
              onClick={() => { setSelected(""); setFilter(f.id); }}
            >
              {f.label}
            </button>
          ))}
          <span className="spacer" />
          <button
            className={`btn small ${live ? "primary" : ""}`}
            onClick={() => setLive((v) => !v)}
            title={live ? "Pause the animated traffic pulses" : "Resume the animated traffic pulses"}
          >
            {live ? "⏸ Live traffic" : "▶ Live traffic"}
          </button>
          <label className="muted" htmlFor="net-inspector"><b>Node inspector</b> <Info id="egoNetwork" /></label>
          <select
            id="net-inspector"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ minWidth: 210 }}
          >
            <option value="">— focus a person (ego network) —</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id} (deg {Number(n.degree).toFixed(4)})
              </option>
            ))}
          </select>
        </div>

        <div className="muted" style={{ marginBottom: 10 }}>
          {subset.mode === "focus" && selected ? (
            <>Showing <b>{selected}</b>'s ego network — {subset.subNodes.length - 1} direct contact{subset.subNodes.length - 1 === 1 ? "" : "s"} ({subset.subEdges.length} links). The focused person is ringed in orange.</>
          ) : subset.mode === "giant-capped" ? (
            <>Giant component holds <b>{result.graph.giant_component_size.toLocaleString()}</b> people ({pct(result.graph.giant_component_pct)} of the network) — showing its top <b>{subset.subNodes.length}</b> hubs to stay legible.</>
          ) : subset.mode === "giant" ? (
            <>Whole giant component — <b>{subset.subNodes.length}</b> people, <b>{subset.subEdges.length}</b> links.</>
          ) : filter === "all" ? (
            <>All <b>{subset.subNodes.length}</b> people, <b>{subset.subEdges.length}</b> links.</>
          ) : (
            <>Top <b>{subset.subNodes.length}</b> hubs by degree, with {subset.subEdges.length} links among them.</>
          )}
        </div>

        <NetworkChart
          subNodes={subset.subNodes}
          subEdges={subset.subEdges}
          x={x}
          y={y}
          idToPos={idToPos}
          live={live}
          selected={selected || null}
          totalPeople={result.graph.total_people}
        />

        {selNode && (
          <div className="card inside" style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
              {selNode.id}
              <span
                className="status"
                style={{ fontSize: 10 }}
              >
                {selNode.status}
              </span>
              <span className="spacer" />
              <span className="muted">degree rank #{nodes.findIndex((n) => n.id === selNode.id) + 1}</span>
            </h3>
            <div className="grid cols-3">
              <div>
                <span className="muted"><Term id="degreeCentrality">Degree centrality</Term></span>
                <div className="mono" style={{ fontSize: 18, color: "var(--cyan)" }}>{selNode.degree.toFixed(4)}</div>
                <span className="muted" style={{ fontSize: 11 }}>{Math.round(selNode.degree * (result.graph.total_people - 1))} direct contacts</span>
              </div>
              <div>
                <span className="muted"><Term id="betweennessCentrality">Betweenness centrality</Term></span>
                <div className="mono" style={{ fontSize: 18, color: "var(--violet)" }}>{selNode.betweenness.toFixed(4)}</div>
                <span className="muted" style={{ fontSize: 11 }}>{selNode.betweenness >= 0.01 ? "acts as a bridge" : "rarely lies on paths"}</span>
              </div>
              <div>
                <span className="muted">Contacts in current view</span>
                <div className="mono" style={{ fontSize: 18 }}>
                  {subset.subEdges.filter(([a, b]) => a === selNode.id || b === selNode.id).length}
                </div>
                <span className="muted" style={{ fontSize: 11 }}>links drawn for this person here</span>
              </div>
            </div>
          </div>
        )}

        <div className="muted" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, marginBottom: 0 }}>
          <span>Dot size = direct contacts (<Term id="degreeCentrality">degree</Term>)</span>
          <span>Dot colour = <Term id="betweennessCentrality">bridge score</Term></span>
          <span>Orange dots = <Term id="liveTraffic">live traffic</Term></span>
          <span>Hover a dot for status, contacts &amp; bridge score</span>
        </div>
        <div className="muted" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <span>Infection status:</span>
          <span><span className="dot" style={{ background: "var(--red)" }} /><Term id="statusConfirmed">Confirmed</Term></span>
          <span><span className="dot" style={{ background: "var(--amber)" }} /><Term id="statusSuspected">Suspected</Term></span>
          <span><span className="dot" style={{ background: "var(--green)" }} /><Term id="statusRecovered">Recovered</Term></span>
          <span><span className="dot" style={{ background: "#9db1cf" }} /><Term id="statusNotIdentified">Not identified</Term></span>
          <span><span className="dot" style={{ background: "var(--dim)" }} /><Term id="statusUnknown">Unknown</Term></span>
        </div>
      </div>
    </div>
  );
}