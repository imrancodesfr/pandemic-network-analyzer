// API client. All analysis happens on the Python side; this only transfers
// files and streams the NDJSON progress lines back to the UI.
import { parseCsvPreview } from "./utils.js";

export async function fetchSample(size) {
  const url = `/api/sample?size=${encodeURIComponent(size)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load sample dataset (HTTP ${resp.status}).`);
  const data = await resp.json();
  const files = {};
  for (const [role, entry] of Object.entries(data.files)) {
    if (!entry.content) continue;
    const blob = new Blob([entry.content], { type: "text/csv" });
    const file = new File([blob], entry.name, { type: "text/csv" });
    const preview = parseCsvPreview(entry.content);
    files[role] = {
      file,
      role,
      name: entry.name,
      bytes: file.size,
      headers: preview.headers,
      rowEstimate: entry.rows,
    };
  }
  return files;
}

export async function analyze(formData, { onLine }) {
  const resp = await fetch("/api/analyze", { method: "POST", body: formData });
  if (resp.status === 400) {
    let msg = `Upload rejected (HTTP ${resp.status}).`;
    try {
      const j = await resp.json();
      if (j && j.error) msg = j.error;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  if (!resp.ok || !resp.body) {
    throw new Error(`Analysis request failed (HTTP ${resp.status}).`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let finished = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\r\n")) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 2);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.type === "error") throw new Error(msg.message || "Analysis failed.");
      onLine?.(msg);
      if (msg.type === "result") finished = true;
    }
  }
  if (!finished) throw new Error("Analysis ended without a result.");
  return true;
}