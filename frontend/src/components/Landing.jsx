const APP_TITLE = "Pandemic Network Analyzer";
const APP_SUBTITLE = "Decision-Support Prototype";

function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="4" cy="10" r="2.4" fill="#fff" />
        <circle cx="10" cy="4" r="2.4" fill="#fff" />
        <circle cx="16" cy="10" r="2.4" fill="#fff" />
        <circle cx="10" cy="16" r="2.4" fill="#fff" />
        <path d="M5.7 8.5 8.5 5.4M11.5 5.4l2.8 3.1M14.3 11.5l-2.8 3.1M8.5 14.6l-2.8-3.1" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const FEATURES = [
  {
    icon: <NetworkSvg />,
    title: "Contact network graphing",
    body: "See the full contact graph instantly — hubs, bridges, and isolated nodes. Explore Top 25, Top 50, the giant component, or everything at once, with a live traffic overlay.",
  },
  {
    icon: <PinSvg />,
    title: "Location hotspot intelligence",
    body: "Rank every location by case-association (Rule 5 thresholds). Inspect any site: unique case visitors, cohort share, and classification in one place.",
  },
  {
    icon: <TargetSvg />,
    title: "Model-backed risk prediction",
    body: "A scikit-learn random forest trained per dataset produces per-person risk scores, feature importance, and a full confusion matrix — all explainable.",
  },
];

const STEPS = [
  { num: "1", title: "Load your data", body: "Drop CSVs (people, contacts, visits, locations) or run a bundled sample with one click." },
  { num: "2", title: "Engine runs 6 stages", body: "Loading → validation (9 layers) → network → hotspots → quality guards → model training unfold live." },
  { num: "3", title: "Explore the live results", body: "Switch between Overview, Network, Hotspots, and Risk tabs — everything is instant after analysis." },
];

const GUARDRAILS = [
  ["Network centrality ≠ clinical priority", "Betweenness and degree rank structure, not biology."],
  ["High case association ≠ proof of contamination", "Exposure scores quantify co-visitation, not causation."],
  ["Model prediction ≠ medical diagnosis", "Outputs are decision-support estimates, never a diagnosis."],
];

export default function Landing({ onLaunch, onQuickDemo }) {
  return (
    <div>
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span className="title">{APP_TITLE}</span>
          <span className="badge">{APP_SUBTITLE}</span>
        </div>
        <nav className="lp-nav">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#guardrails">Guardrails</a>
        </nav>
        <div className="actions">
          <button className="btn primary" onClick={onLaunch}>Launch Analyzer</button>
        </div>
      </header>

      <div className="lp-hero">
        <div className="lp-hero-grid">
          <div className="lp-copy">
            <div className="lp-eyebrow">PANDEMIC NETWORK ANALYZER</div>
            <h1 className="lp-h1">See how a pathogen moves through a population — before it moves again.</h1>
            <p className="lp-sub">
              Upload contact and movement data — or run a bundled sample — and track the live contact graph,
              hotspot exposure, and per-person risk through one clean, decision-support dashboard.
            </p>
            <div className="cta-row">
              <button className="btn primary" onClick={onLaunch}>Launch Analyzer</button>
              <button className="btn outline" onClick={onQuickDemo}>▶ Watch a live sample</button>
            </div>
            <div className="lp-pills">
              <a href="#features">Gain Critical Insights</a>
              <a href="#how">Learn How It Works</a>
              <a href="#guardrails">Prevent False Conclusions</a>
            </div>
          </div>

          <HeroPreview />
        </div>
      </div>

      <div className="lp-strip lp-allwhite" id="features">
        <div className="lp-section">
          <div className="lp-eyebrow lp-soft">WHAT YOU GET</div>
          <h2>Everything a network analyst needs, under one roof</h2>
          <div className="lp-cards">
            {FEATURES.map((f) => (
              <div className="lp-card" key={f.title}>
                <div className="lp-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-strip" id="how">
        <div className="lp-section">
          <div className="lp-eyebrow lp-soft">FROM FILES TO INSIGHT IN SECONDS</div>
          <h2>How it works</h2>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div className="lp-step" key={s.num}>
                <div className="lp-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-strip lp-allwhite" id="guardrails">
        <div className="lp-section lp-narrow">
          <div className="lp-eyebrow lp-soft">BUILT TO BE DEFENSIBLE</div>
          <h2>Three guardrails we never cross</h2>
          <div className="lp-rules">
            {GUARDRAILS.map(([title, body]) => (
              <div className="lp-rule" key={title}>
                <span className="lp-rule-icon">•</span>
                <div>
                  <b>{title}</b>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-quote">
        <p>
          “We want to understand the cause of slowness as quickly as possible, and remedy it. This does that for us,
          efficiently, effectively, and with beautiful graphs we can share with stakeholders.”
        </p>
        <span>— Network Analyst · Public Health Research</span>
      </div>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <b>Pandemic Network Analyzer</b>
            <p>Decision-support prototype. Analytical results are computed by the Python pipeline only — the UI never approximates a number.</p>
          </div>
          <div className="lp-footer-links">
            <span>networkx · pandas · scikit-learn · plotly</span>
            <span>React · Node.js · Python</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NetworkSvg() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.4" stroke="#f15d22" strokeWidth="1.6" />
      <circle cx="4" cy="5" r="2.4" stroke="#17324f" strokeWidth="1.6" />
      <circle cx="20" cy="5" r="2.4" stroke="#17324f" strokeWidth="1.6" />
      <circle cx="4" cy="19" r="2.4" stroke="#17324f" strokeWidth="1.6" />
      <circle cx="20" cy="19" r="2.4" stroke="#17324f" strokeWidth="1.6" />
      <path d="M6.2 7.2 9.6 10.6M17.8 7.2l-3.4 3.4M6.2 16.8l3.4-3.4M17.8 16.8 14.4 13.4" stroke="#8ea0c4" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function PinSvg() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" stroke="#f15d22" strokeWidth="1.6" />
      <circle cx="12" cy="11" r="2.3" stroke="#17324f" strokeWidth="1.6" />
    </svg>
  );
}
function TargetSvg() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="#17324f" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="#f15d22" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.8" fill="#17324f" />
    </svg>
  );
}

function HeroPreview() {
  return (
    <div className="lp-preview">
      <div className="lp-preview-head">
        <span className="lp-preview-dot" style={{ background: "#d8392c" }} />
        <span className="lp-preview-dot" style={{ background: "#e8910a" }} />
        <span className="lp-preview-dot" style={{ background: "#1f9d55" }} />
        <span className="lp-preview-title">Live network view</span>
        <span className="lp-preview-live">● live</span>
      </div>
      <div className="lp-preview-stats">
        <div><span>Nodes</span><b>499</b></div>
        <div><span>Edges</span><b>1,471</b></div>
        <div><span>Hotspots</span><b>6</b></div>
        <div><span>AUC</span><b>0.843</b></div>
      </div>
      <svg className="lp-preview-graph" viewBox="0 0 260 150" fill="none">
        <g stroke="#c8d2e6" strokeWidth="1">
          <path d="M35 108 100 78M100 78 175 55M100 78 130 120M175 55 205 30M175 55 225 70M130 120 205 110M35 108 60 30M205 30 60 30M60 30 25 60" />
        </g>
        <g fill="#c3cede">
          <circle cx="35" cy="108" r="7" />
          <circle cx="100" cy="78" r="10" fill="#f15d22" />
          <circle cx="175" cy="55" r="9" />
          <circle cx="130" cy="120" r="6" />
          <circle cx="205" cy="30" r="6" />
          <circle cx="225" cy="70" r="5" />
          <circle cx="205" cy="110" r="5" />
          <circle cx="60" cy="30" r="6" />
          <circle cx="25" cy="60" r="5" />
        </g>
        <circle r="3.4" fill="#fff" stroke="#f15d22" strokeWidth="1.6">
          <animateMotion dur="2.6s" repeatCount="indefinite" path="M100 78 175 55" />
        </circle>
        <circle r="3.2" fill="#fff" stroke="#1f9d55" strokeWidth="1.6">
          <animateMotion dur="3.1s" repeatCount="indefinite" begin="0.4s" path="M130 120 205 110" />
        </circle>
        <circle r="3" fill="#fff" stroke="#17324f" strokeWidth="1.5">
          <animateMotion dur="2.2s" repeatCount="indefinite" begin="1.1s" path="M35 108 100 78" />
        </circle>
      </svg>
      <div className="lp-preview-foot">
        <span className="lp-bar" style={{ width: "38%", background: "#d8392c" }} />
        <span className="lp-bar" style={{ width: "30%", background: "#e8910a" }} />
        <span className="lp-bar" style={{ width: "52%", background: "#1f9d55" }} />
        <span>6 stages · 9 validation layers · per-person risk</span>
      </div>
    </div>
  );
}