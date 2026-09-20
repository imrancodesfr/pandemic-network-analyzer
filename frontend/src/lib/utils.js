export const ROLE_CONFIG = {
  people: { label: "people", required: true, keyCols: ["Person_ID", "Infection_Status"] },
  contacts: { label: "contacts", required: true, keyCols: ["Person_A", "Person_B"] },
  visits: { label: "visits", required: true, keyCols: ["Person_ID", "Location_ID"] },
  locations: { label: "locations", required: false, keyCols: ["Location_ID"] },
};

const FILENAME_RULES = {
  people: ["people"],
  contacts: ["contact"],
  visits: ["visit"],
  locations: ["location"],
};

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function pct(v, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function parseCsvPreview(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = (lines[0] || "").split(",").map((h) => h.trim());
  return {
    headers: header,
    rowEstimate: Math.max(0, lines.length - 1),
    sample: lines.slice(1, 6),
  };
}

export function detectRole({ headers = [], name = "" }) {
  const has = (c) => headers.includes(c);
  const lower = name.toLowerCase();
  if (has("Person_A") && has("Person_B")) return "contacts";
  if (has("Person_ID") && has("Infection_Status")) return "people";
  if (has("Person_ID") && has("Location_ID") && has("Visit_Date")) return "visits";
  if (has("Location_ID") && !has("Person_ID")) return "locations";
  for (const [role, patterns] of Object.entries(FILENAME_RULES)) {
    if (patterns.some((p) => lower.includes(p))) return role;
  }
  return null;
}

export function roleIssueCount(files) {
  let assigned = 0;
  for (const key of ["people", "contacts", "visits"]) {
    if (files[key]) assigned += 1;
  }
  return assigned;
}

export function groupRules(validation) {
  const groups = [];
  for (const [key, rules] of Object.entries(validation || {})) {
    if (!Array.isArray(rules)) continue;
    const counts = { PASS: 0, WARNING: 0, ERROR: 0 };
    for (const r of rules) counts[r.status] = (counts[r.status] || 0) + 1;
    groups.push({ key, rules, counts });
  }
  return groups;
}