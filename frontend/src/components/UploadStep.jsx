import { useRef, useState } from "react";
import { ROLE_CONFIG, formatBytes, parseCsvPreview, detectRole } from "../lib/utils.js";
import { fetchSample } from "../lib/api.js";
import { HelpBox, Term } from "./Help.jsx";

const SAMPLE_SIZES = [
  { id: "small", desc: "500 people · ~3k records", blurb: "Instant demo on a compact community" },
  { id: "medium", desc: "1,000 people · ~6k records", blurb: "A typical town outpatient setting" },
  { id: "large", desc: "2,000 people · ~13k records", blurb: "Larger metro / campus network" },
  { id: "xlarge", desc: "3,000 people · ~22k records", blurb: "Stress test — sampled betweenness" },
];

const GUARDRAIL_BANNER =
  "[GUARDRAIL: NETWORK CENTRALITY ≠ CLINICAL PRIORITY | HIGH CASE ASSOCIATION ≠ PROOF OF CONTAMINATION | MODEL PREDICTION ≠ MEDICAL DIAGNOSIS]";

export default function UploadStep({ files, setFiles, onRun, onQuickDemo, loadingSample, setLoadingSample, busy }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState(null);

  const requiredKeys = ["people", "contacts", "visits"];
  const assignedRequired = requiredKeys.filter((k) => files[k]).length;
  const ready = assignedRequired === requiredKeys.length && !busy;

  function addPreviews(fileList) {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    const next = { ...files };
    for (const file of arr) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const preview = parseCsvPreview(text);
        const role = detectRole({ headers: preview.headers, name: file.name });
        if (!role) {
          setNotice(`${file.name}: could not detect its role — check the CSV headers.`);
          return;
        }
        if (next[role] && next[role].name !== file.name) {
          setNotice(`${ROLE_CONFIG[role].label} file replaced (${file.name}).`);
        }
        next[role] = {
          file,
          role,
          name: file.name,
          bytes: file.size,
          headers: preview.headers,
          rowEstimate: preview.rowEstimate,
        };
        window.setTimeout(() => {
          setFiles({ ...next });
          setNotice(null);
        }, 0);
      };
      reader.readAsText(file);
    }
    if (arr.length > 0 && inputRef.current) inputRef.current.value = "";
  }

  function remove(role) {
    const next = { ...files };
    delete next[role];
    setFiles(next);
  }

  async function loadSample(size, runAfter = false) {
    setLoadingSample(size);
    try {
      const filesObj = await fetchSample(size);
      setFiles((prev) => {
        const next = { ...prev };
        for (const [role, meta] of Object.entries(filesObj)) next[role] = meta;
        return next;
      });
      setNotice(runAfter
        ? `Loaded ${size} sample — analysis starting now.`
        : `Loaded ${size} sample dataset — review the files below, then run analysis.`);
      if (runAfter) {
        window.setTimeout(() => onRun(), 250);
      }
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoadingSample(null);
    }
  }

  return (
    <div>
      <div className="hero">
        <h1>Analyze contact networks &amp; exposure patterns</h1>
        <p className="sub">
          Upload your own CSV datasets — or go straight to a bundled sample — and the Python engine will
          build the <Term id="people">contact graph</Term>, rank <Term id="hub">hubs</Term> and <Term id="bridge">bridges</Term>,
          flag location <Term id="hotspotsFlagged">hotspots</Term>, and train a <Term id="riskScore">risk model</Term>.
          Everything is computed by networkx · pandas · scikit-learn.
        </p>
        <div className="cta-row">
          <button
            className="btn primary"
            disabled={!!loadingSample || busy}
            onClick={() => loadSample("small", true)}
          >
            ▶ Run a sample analysis
          </button>
          <button
            className="btn outline"
            onClick={() => document.getElementById("upload-own")?.scrollIntoView({ behavior: "smooth" })}
          >
            Upload your own data
          </button>
          <span className="cta-note">No uploads required to get started — fully functional sample datasets included.</span>
        </div>
      </div>

      <div className="banner">{GUARDRAIL_BANNER}</div>
      <HelpBox title="What do the guardrails mean?">
        <ul>
          <li><b>Network centrality ≠ clinical priority</b> — being a well-connected <Term id="hub">hub</Term> ranks structure, not medical risk.</li>
          <li><b>High case association ≠ proof of contamination</b> — a location with many <Term id="uniqueCaseVisitors">case visitors</Term> is an association signal, not evidence that the place spread infection.</li>
          <li><b>Model prediction ≠ medical diagnosis</b> — the <Term id="riskScore">risk score</Term> is a screening/ranking estimate, never a diagnosis.</li>
        </ul>
      </HelpBox>

      <div className="section-tag">Try it now — bundled sample datasets</div>
      <div className="samples">
        {SAMPLE_SIZES.map((s) => (
          <div className="sample-card" key={s.id}>
            <span className="name">{s.id}</span>
            <span className="desc" style={{ fontSize: 12, color: "var(--mut)" }}>{s.desc}</span>
            <span className="spec">{s.blurb}</span>
            <div className="actions">
              <button
                className={`btn small ${loadingSample === s.id ? "primary" : ""}`}
                disabled={!!loadingSample || busy}
                onClick={() => loadSample(s.id)}
              >
                {loadingSample === s.id ? "loading…" : "use"}
              </button>
              <button
                className="btn small primary"
                disabled={!!loadingSample || busy}
                onClick={() => loadSample(s.id, true)}
                title="Load this sample and start analysis immediately"
              >
                ▶ analyze
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="section-tag">Or upload your own data</div>
      <div className="card" id="upload-own" style={{ scrollMarginTop: 70 }}>
        <h3 style={{ marginTop: 0 }}>Add your CSV files</h3>
        <HelpBox title="What do the four files mean?">
          <ul>
            <li><b>people</b> — one row per person. <code>Person_ID</code> identifies them; <code>Infection_Status</code> is their recorded case status (Confirmed / Suspected / Recovered / Not_Identified).</li>
            <li><b>contacts</b> — one row per interaction: <code>Person_A</code> met <code>Person_B</code>. Each row becomes an edge (line) in the network.</li>
            <li><b>visits</b> — one row per visit: a <code>Person_ID</code> attended a <code>Location_ID</code>. This is how hotspots are found.</li>
            <li><b>locations</b> — optional list of places (<code>Location_ID</code>). Helpful but not required.</li>
          </ul>
        </HelpBox>
        <p className="muted" style={{ marginTop: 0 }}>
          Drop files anywhere here — roles are detected automatically from the CSV columns
          (people: <code>Person_ID, Infection_Status</code> · contacts: <code>Person_A, Person_B</code> ·
          visits: <code>Person_ID, Location_ID</code> · locations: <code>Location_ID</code>).
        </p>

        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addPreviews(e.dataTransfer.files); }}
        >
          <span className="drop-icon">📁</span>
          <div className="big">drag &amp; drop your CSV files, or click to browse</div>
          <div className="sub">You can drop all four files at once — each is matched to its role by its columns</div>
          <span className="hint">browse files</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            multiple
            hidden
            onChange={(e) => addPreviews(e.target.files)}
          />
        </div>

        {notice && <div className={`alert ${notice.includes("analysis starting") ? "success" : notice.startsWith("Loaded") ? "info" : "warn"}`}>{notice}</div>}
        {!notice && Object.keys(files).length === 0 && (
          <div className="alert info">No files added yet. Load a bundled sample dataset above to try the tool in seconds.</div>
        )}

        {Object.keys(files).length > 0 && (
          <div className="filelist">
            {Object.entries(files).map(([role, meta]) => {
              const cfg = ROLE_CONFIG[role];
              const missingCols = cfg.keyCols.filter((c) => !meta.headers.includes(c));
              const roleOk = missingCols.length === 0;
              return (
                <div key={role} className={`filerow ${roleOk ? "role-ok" : "role-unknown"}`}>
                  <span className="role">{cfg.label}</span>
                  <span className="name" title={meta.name}>{meta.name}</span>
                  <span className="meta">{formatBytes(meta.bytes)} · ~{meta.rowEstimate.toLocaleString()} rows</span>
                  <div className="cols">
                    {meta.headers.map((h) => (
                      <span key={h} className={`chip ${cfg.keyCols.includes(h) ? "ok" : ""}`}>{h}</span>
                    ))}
                    {missingCols.length > 0 && (
                      <span className="chip" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
                        missing: {missingCols.join(", ")}
                      </span>
                    )}
                  </div>
                  <button className="remove" title="Remove file" onClick={() => remove(role)}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div className="spacer" style={{ flex: 1, minWidth: 240 }}>
          {ready ? (
            <span className="muted" style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>
              ● All required files selected — ready to analyze.
            </span>
          ) : (
            <span className="muted">
              Select <b style={{ color: "var(--amber)" }}>{requiredKeys.filter((k) => !files[k]).map((k) => ROLE_CONFIG[k].label).join(", ")}</b> to enable analysis. Files are previewed locally before anything is sent.
            </span>
          )}
        </div>
        <button className="btn primary" disabled={!ready} onClick={onRun} style={{ fontSize: 14, padding: "13px 28px" }}>
          {ready ? "▶ Run Analysis" : "Run Analysis"}
        </button>
      </div>
    </div>
  );
}