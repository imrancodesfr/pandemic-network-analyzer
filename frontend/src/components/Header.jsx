const APP_TITLE = "Pandemic Network Analyzer";
const APP_SUBTITLE = "Decision-Support Prototype";

export default function Header({ onReset }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">🔬</span>
        <span className="title">{APP_TITLE}</span>
        <span className="badge">{APP_SUBTITLE}</span>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onReset}>↺ Reset</button>
      </div>
    </header>
  );
}