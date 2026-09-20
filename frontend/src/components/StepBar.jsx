const STEPS = [
  { id: "upload", label: "Upload data" },
  { id: "running", label: "Analyze" },
  { id: "results", label: "Results" },
];

export default function StepBar({ current }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="steps">
      {STEPS.map((s, i) => (
        <span key={s.id} style={{ display: "contents" }}>
          <span className={`step ${i === idx ? "active" : i < idx ? "done" : ""}`}>
            <span className="num">{i < idx ? "✓" : i + 1}</span>
            {s.label}
          </span>
          {i < STEPS.length - 1 && <span className="step-link" />}
        </span>
      ))}
    </div>
  );
}