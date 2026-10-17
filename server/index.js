import express from "express";
import multer from "multer";
import cors from "cors";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const MODEL_DIR = path.join(PROJECT_ROOT, "models");
const DIST_DIR = path.join(PROJECT_ROOT, "frontend", "dist");
const DATASETS_DIR = path.join(PROJECT_ROOT, "data", "datasets");
const PYTHON = process.env.PYTHON || "python";
const WORKER = path.join(PROJECT_ROOT, "api", "analysis_worker.py");

const app = express();
app.use(cors());
app.use(express.json());

const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);

// Log every request with duration + outcome (including early client aborts).
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - t0}ms)`));
  res.on("close", () => {
    if (!res.writableEnded) log(`${req.method} ${req.originalUrl} → client aborted after ${Date.now() - t0}ms`);
  });
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const FILE_FIELDS = [
  { name: "peopleFile", maxCount: 1 },
  { name: "contactsFile", maxCount: 1 },
  { name: "visitsFile", maxCount: 1 },
  { name: "locationsFile", maxCount: 1 },
];

// ---- Python worker invocation -------------------------------------------------

function runWorker(csvFiles, onLine, onEnd, onError) {
  const args = ["-u", WORKER, "--model-dir", MODEL_DIR];
  for (const key of ["people", "contacts", "visits", "locations"]) {
    if (csvFiles[key]) args.push(`--${key}`, csvFiles[key]);
  }

  const child = spawn(PYTHON, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  lines.on("line", onLine);

  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d.toString()));

  const killTimer = setTimeout(() => {
    child.kill();
    onError(new Error("Analysis timed out after 10 minutes."));
  }, 10 * 60 * 1000);

  child.on("error", (err) => {
    clearTimeout(killTimer);
    onError(err);
  });

  child.on("close", (code) => {
    clearTimeout(killTimer);
    if (code === 0) {
      onEnd();
    } else {
      onError(new Error(stderr.trim() || `Analysis process exited with code ${code}.`));
    }
  });

  return child;
}

// ---- Routes -------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, python: PYTHON });
});

app.get("/api/sample", (req, res) => {
  const size = String(req.query.size || "small").replace(/[^a-z]/g, "");
  if (!["small", "medium", "large", "xlarge"].includes(size)) {
    return res.status(400).json({ error: `Unknown sample size '${size}'.` });
  }
  const dir = path.join(DATASETS_DIR, size);
  const out = { size, files: {} };
  for (const name of ["people", "contacts", "visits", "locations"]) {
    const p = path.join(dir, `${name}.csv`);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, "utf8");
    out.files[name] = {
      name: `${name}.csv`,
      content,
      rows: Math.max(0, content.trim().split(/\r?\n/).length - 1),
    };
  }
  res.json(out);
});

app.post("/api/analyze", upload.fields(FILE_FIELDS), (req, res) => {
  const t0 = Date.now();
  log("analyze START: files=", Object.keys(req.files ?? {}).join(",") || "none");
  res.on("close", () => {
    if (res.writableEnded) log(`analyze DONE in ${Date.now() - t0}ms`);
  });

  const files = req.files ?? {};
  const missing = [];
  for (const key of ["peopleFile", "contactsFile", "visitsFile"]) {
    if (!(files[key] && files[key].length)) missing.push(key);
  }
  if (missing.length) {
    return res.status(400).json({ error: `Missing required uploads: ${missing.join(", ")}` });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pna-"));
  const csvFiles = {};
  const nameMap = {
    peopleFile: "people",
    contactsFile: "contacts",
    visitsFile: "visits",
    locationsFile: "locations",
  };

  try {
    for (const [field, arr] of Object.entries(files)) {
      const kind = nameMap[field];
      const f = arr[0];
      const p = path.join(tmpDir, `${kind}.csv`);
      fs.writeFileSync(p, f.buffer);
      csvFiles[kind] = p;
    }
    const hasLocations = files.locationsFile && files.locationsFile.length;

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.flushHeaders();

    let sentResult = false;

    runWorker(
      csvFiles,
      (line) => {
        if (line.trim() === "") return;
        res.write(`${line}\r\n`);
        try {
          const msg = JSON.parse(line);
          if (msg.type === "result") sentResult = true;
        } catch {
          /* forward raw lines verbatim */
        }
      },
      () => {
        cleanup(tmpDir);
        res.end();
      },
      (err) => {
        cleanup(tmpDir);
        if (!res.writableEnded) {
          res.write(
            `${JSON.stringify({ type: "error", message: err.message })}\r\n`
          );
          res.end();
        }
      }
    );
  } catch (err) {
    cleanup(tmpDir);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

// ---- Static frontend ----------------------------------------------------------

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res
      .status(200)
      .send("API live. Frontend not built yet — run `npm run build` in frontend/. Use dev: `npm run dev` in frontend/.");
  });
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  log(`API + app listening on http://localhost:${PORT}`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${PORT} is already in use — the server is probably already running.`);
    console.error(`Open http://localhost:${PORT} in your browser. (To restart: kill the old Node process first.)\n`);
    process.exit(1);
  }
  throw err;
});