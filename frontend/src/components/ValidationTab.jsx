import { groupRules } from "../lib/utils.js";
import { Info, Term, HelpBox } from "./Help.jsx";

const GROUP_LABELS = {
  people: "People dataset",
  contacts: "Contacts dataset",
  visits: "Visits dataset",
  contact_events: "Contact events (consistency)",
  location_visits: "Location visits (coverage & timing)",
  graph: "Contact graph structure",
  privacy: "Privacy / PII scan",
  model_features: "Model feature validation",
  training_data: "Training-data guards",
};

const STATUS_TERM = { PASS: "validationPass", WARNING: "validationWarning", ERROR: "validationError" };

function RuleRow({ rule }) {
  return (
    <div className="rule">
      <span className={`status ${rule.status}`}><Term id={STATUS_TERM[rule.status]}>{rule.status}</Term></span>
      <span className="msg">
        {rule.message}
        {rule.affected_records > 1 && (
          <span className="muted"> · {rule.affected_records} records</span>
        )}
      </span>
      <span className="code">{rule.code}</span>
    </div>
  );
}

export default function ValidationTab({ result }) {
  const groups = groupRules(result.validation);

  let totalP = 0, totalW = 0, totalE = 0;
  for (const g of groups) {
    totalP += g.counts.PASS || 0;
    totalW += g.counts.WARNING || 0;
    totalE += g.counts.ERROR || 0;
  }

  const total = totalP + totalW + totalE;
  const passRate = total > 0 ? (totalP / total) * 100 : 0;

  return (
    <div>
      <div className="grid cols-3">
        <div className="metric green"><div className="label">Rules passed <Info id="validationPass" /></div><div className="value">{totalP}</div></div>
        <div className="metric amber"><div className="label">Warnings <Info id="validationWarning" /></div><div className="value">{totalW}</div></div>
        <div className="metric red"><div className="label">Errors raised <Info id="validationError" /></div><div className="value">{totalE}</div></div>
      </div>

      <HelpBox title="What is being validated?">
        <ul>
          <li><b>PASS</b> — the dataset satisfies the check. <b><Term id="validationWarning">WARNING</Term></b> — a minor issue that does not stop the analysis. <b><Term id="validationError">ERROR</Term></b> — a blocking problem.</li>
          <li>Checks cover schema (required columns), referential integrity (IDs that link across files), event consistency (dates/times), graph structure, a <Term id="privacyAudit">privacy/PII scan</Term>, and <Term id="targetLeakage">leakage</Term> guards for the model.</li>
          <li>Hover any <Term id="validationPass">PASS</Term> / <Term id="validationWarning">WARNING</Term> / <Term id="validationError">ERROR</Term> tag to see its meaning.</li>
        </ul>
      </HelpBox>

      <div className="card inside" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 6 }}>
          <span>Validation health <Info id="validationHealth" /></span>
          <span style={{ color: passRate >= 95 ? "var(--green)" : passRate >= 75 ? "var(--amber)" : "var(--red)" }}>
            {passRate.toFixed(1)}% clean
          </span>
        </div>
        <div className="bar-track">
          <div
            className="bar-fill"
            style={{
              width: `${passRate}%`,
              background: passRate >= 95
                ? "linear-gradient(90deg, var(--cyan-strong), var(--cyan))"
                : passRate >= 75
                  ? "linear-gradient(90deg, var(--amber), var(--cyan))"
                  : "linear-gradient(90deg, var(--red), var(--amber))",
            }}
          />
        </div>
        <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
          {total} checks across 9 validation layers — schema, referential integrity, event consistency,
          graph structure, privacy scan, model-feature and training-data guards.
        </p>
      </div>

      {groups.map((g) => (
        <div className="card" key={g.key}>
          <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span>{GROUP_LABELS[g.key] || g.key}</span>
            <span className="muted" style={{ fontFamily: "var(--mono)" }}>
              {g.counts.PASS ? <span className="dot ok" /> : null}{g.counts.PASS || 0}
              {g.counts.WARNING ? <span className="dot warn" /> : null}{g.counts.WARNING || 0}
              {g.counts.ERROR ? <span className="dot bad" /> : null}{g.counts.ERROR || 0}
            </span>
          </h3>
          {g.rules.map((r, i) => <RuleRow key={`${g.key}-${i}`} rule={r} />)}
        </div>
      ))}
    </div>
  );
}