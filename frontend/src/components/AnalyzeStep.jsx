export default function AnalyzeStep({ stages, error }) {
  if (error) {
    return (
      <div className="center-note">
        <div className="alert error" style={{ maxWidth: 560, margin: "0 auto" }}>{error}</div>
        <div style={{ marginTop: 18 }}>
          <button className="btn primary" onClick={() => window.location.reload()}>↺ Start over</button>
        </div>
      </div>
    );
  }

  if (!stages.length) {
    return <div className="center-note">Starting analysis…</div>;
  }

  const done = stages.filter((s) => s.state === "done").length;
  const current = stages.find((s) => s.state === "current");

  return (
    <div>
      <div className="card" style={{ maxWidth: 660, margin: "0 auto" }}>
        <h3 style={{ textAlign: "center" }}>
          <span style={{ color: "var(--cyan)", fontFamily: "var(--mono)" }}>{done}/{stages.length}</span> ·
          {" "}{current?.label || "Finalizing…"}
        </h3>
        <div style={{ height: 6, background: "var(--bg0)", borderRadius: 3, overflow: "hidden", margin: "16px 0 22px" }}>
          <div
            style={{
              height: "100%",
              width: `${(done / Math.max(stages.length, 1)) * 100}%`,
              background: "var(--cyan-strong)",
              transition: "width 0.4s",
            }}
          />
        </div>
        <div className="progress-list">
          {stages.map((s) => (
            <div key={s.stage} className={`progress-item ${s.state}`}>
              <span className="node" />
              <span className="label">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 22, marginBottom: 0 }}>
          This stage runs once per dataset — switching tabs and exploring results later is instant.
        </p>
      </div>
    </div>
  );
}