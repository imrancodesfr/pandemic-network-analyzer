// One-shot end-to-end test: starts the server, exercises /api/health,
// /api/sample, and a full /api/analyze multipart upload, then shuts down.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 3210;
const BASE = `http://localhost:${PORT}`;

const server = spawn("node", ["index.js"], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
server.stderr.on("data", (d) => (stderr += d.toString()));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitHealth() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await sleep(500);
  }
  throw new Error("server did not come up: " + stderr);
}

function csv(name) {
  return fs.readFileSync(path.join(ROOT, "data", "datasets", "small", `${name}.csv`));
}

const t0 = Date.now();
try {
  await waitHealth();
  console.log("health: OK");

  const home = await fetch(`${BASE}/`);
  const homeHtml = await home.text();
  console.log("static / :", home.status, homeHtml.includes("Pandemic Network Analyzer") ? "serves app HTML ✓" : "UNEXPECTED");

  const sample = await (await fetch(`${BASE}/api/sample?size=small`)).json();
  console.log(
    `sample: ${Object.entries(sample.files).map(([k, v]) => `${k}=${v.rows}`).join(", ")}`
  );

  const fd = new FormData();
  fd.append("peopleFile", new Blob([csv("people")], { type: "text/csv" }), "people.csv");
  fd.append("contactsFile", new Blob([csv("contacts")], { type: "text/csv" }), "contacts.csv");
  fd.append("visitsFile", new Blob([csv("visits")], { type: "text/csv" }), "visits.csv");
  fd.append("locationsFile", new Blob([csv("locations")], { type: "text/csv" }), "locations.csv");

  const resp = await fetch(`${BASE}/api/analyze`, { method: "POST", body: fd });
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  const lines = [];
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\r\n");
    buf = parts.pop();
    for (const p of parts) if (p.trim()) lines.push(p.trim());
  }
  if (buf.trim()) lines.push(buf.trim());

  const stages = lines.filter((l) => JSON.parse(l).type === "stage");
  const result = lines.find((l) => JSON.parse(l).type === "result");
  const err = lines.find((l) => JSON.parse(l).type === "error");
  console.log(`analyze: HTTP ${resp.status}, ${stages.length} stages, result=${!!result}, error=${err ? JSON.parse(err).message : "none"}`);
  if (!result) process.exitCode = 1;
  else {
    const d = JSON.parse(result).data;
    console.log(`  total time ${((Date.now() - t0) / 1000).toFixed(1)}s, nodes=${d.nodes.length}, edges=${d.edges.length}, predictions=${d.predictions.total}, hotspots=${d.hotspot_summary.high_association}`);
  }
} catch (e) {
  console.error("FAIL:", e.message);
  process.exitCode = 1;
} finally {
  server.kill();
}