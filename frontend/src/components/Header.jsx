const APP_TITLE = "Pandemic Network Analyzer";
const APP_SUBTITLE = "Decision-Support Prototype";

export default function Header({ onReset }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="4" cy="10" r="2.4" fill="#fff" />
            <circle cx="10" cy="4" r="2.4" fill="#fff" />
            <circle cx="16" cy="10" r="2.4" fill="#fff" />
            <circle cx="10" cy="16" r="2.4" fill="#fff" />
            <path d="M5.7 8.5 8.5 5.4M11.5 5.4l2.8 3.1M14.3 11.5l-2.8 3.1M8.5 14.6l-2.8-3.1" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="title">{APP_TITLE}</span>
        <span className="badge">{APP_SUBTITLE}</span>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onReset}>↺ Reset</button>
      </div>
    </header>
  );
}