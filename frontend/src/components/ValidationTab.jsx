import { groupRules } from "../lib/utils.js";

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

function RuleRow({ rule }) {
  return (
    <div className="rule">
      <span className={`status ${rule.status}`}>{rule.status}</span>
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

  return (
    <div>
      <div className="grid cols-3">
        <div className="metric green"><div className="label">Rules passed</div><div className="value">{totalP}</div></div>
        <div className="metric amber"><div className="label">Warnings</div><div className="value">{totalW}</div></div>
        <div className="metric red"><div className="label">Errors raised</div><div className="value">{totalE}</div></div>
      </div>

      {groups.map((g) => (
        <div className="card" key={g.key}>
          <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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