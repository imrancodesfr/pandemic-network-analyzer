import { useRef, useState } from "react";
import { ROLE_CONFIG, formatBytes, parseCsvPreview, detectRole } from "../lib/utils.js";
import { fetchSample } from "../lib/api.js";

const SAMPLE_SIZES = ["small", "medium", "large", "xlarge"];
const GUARDRAIL_BANNER =
  "[GUARDRAIL: NETWORK CENTRALITY ≠ CLINICAL PRIORITY | HIGH CASE ASSOCIATION ≠ PROOF OF CONTAMINATION | MODEL PREDICTION ≠ MEDICAL DIAGNOSIS]";

export default function UploadStep({ files, setFiles, onRun, loadingSample, setLoadingSample, busy }) {
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

  async function loadSample(size) {
    setLoadingSample(size);
    try {
      const filesObj = await fetchSample(size);
      setFiles((prev) => {
        const next = { ...prev };
        for (const [role, meta] of Object.entries(filesObj)) next[role] = meta;
        return next;
      });
      setNotice(`Loaded ${size} sample dataset — review the files below, then run analysis.`);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoadingSample(null);
    }
  }

  return (
    <div>
      <div className="banner">{GUARDRAIL_BANNER}</div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        {requiredKeys.map((k) => {
          const cfg = ROLE_CONFIG[k];
          const ok = !!files[k];
          return (
            <div className="metric" key={k}>
              <div className="label">{cfg.label}
                <span className={`dot ${ok ? "ok" : "warn"}`} style={{ float: "right" }} />
              </div>
              <div className="value" style={{ fontSize: 14, marginTop: 8 }}>
                {ok ? (
                  <>
                    <span className="unit" style={{ color: "var(--green)" }}>● loaded</span>
                    {" "}· {files[k].rowEstimate.toLocaleString()} rows
                  </>
                ) : (
                  <span className="unit" style={{ color: "var(--amber)" }}>● missing (required)</span>
                )}
              </div>
            </div>
          );
        })}
        <div className="metric" style={{ gridColumn: "1 / -1" }}>
          <div className="label">Ready check</div>
          <div className="value" style={{ fontSize: 14, marginTop: 8 }}>
            <span className={`unit`} style={{ color: ready ? "var(--green)" : "var(--amber)" }}>
              {assignedRequired} / 3 required files
              {files.locations ? " · locations present (optional)" : " · locations optional"}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>1 · Add your CSV files</h3>
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
          <div className="big">drag &amp; drop your CSV files, or click to browse</div>
          <div className="sub">You can drop all files at once — each is matched to its role by its columns</div>
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

        {notice && <div className={`alert ${notice.startsWith("Loaded") ? "info" : "warn"}`}>{notice}</div>}
        {!notice && assignedRequired === 0 && (
          <div className="alert info">No files added yet. Load a bundled sample dataset below to try the tool instantly.</div>
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

      <div className="samples">
        <span className="lbl">or load bundled sample data:</span>
        {SAMPLE_SIZES.map((s) => (
          <button
            key={s}
            className={`btn ${loadingSample === s ? "primary" : ""}`}
            disabled={!!loadingSample || busy}
            onClick={() => loadSample(s)}
          >
            {loadingSample === s ? "Loading…" : s}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div className="spacer" style={{ flex: 1, minWidth: 220 }}>
          {ready ? (
            <span className="muted bold" style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>
              ● All required files selected — ready to analyze.
            </span>
          ) : (
            <span className="muted">
              Select <b style={{ color: "var(--amber)" }}>{requiredKeys.filter((k) => !files[k]).map((k) => ROLE_CONFIG[k].label).join(", ")}</b> to enable analysis. Files are previewed locally before anything is sent.
            </span>
          )}
        </div>
        <button className="btn primary" disabled={!ready} onClick={onRun} style={{ fontSize: 14, padding: "12px 26px" }}>
          {ready ? "▶ Run Analysis" : "Run Analysis"}
        </button>
      </div>
    </div>
  );
}