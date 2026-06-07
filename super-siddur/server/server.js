"use strict";
/*
 * The Super Siddur — production server.
 *
 * Serves the static PWA from ../public and exposes a tiny admin content API so
 * that edits made in the in-app admin panel persist server-side (data/content.json)
 * and are served to every visitor — not just the editing device's localStorage.
 *
 * Admin writes require the X-Admin-Token header to match ADMIN_TOKEN.
 */
const express = require("express");
const path = require("path");
const fs = require("fs");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PORT = process.env.PORT || 8080;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

fs.mkdirSync(DATA_DIR, { recursive: true });

/** Seed content.json from the bundled textdata.js the first time the server runs. */
function seedContent() {
  if (fs.existsSync(CONTENT_FILE)) return;
  const src = fs.readFileSync(path.join(PUBLIC_DIR, "js", "textdata.js"), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: "textdata.js" });
  const data = sandbox.window.TEXTDATA || [];
  writeContent(data);
  console.log(`[seed] wrote ${data.length} docs to ${CONTENT_FILE}`);
}

function readContent() {
  return JSON.parse(fs.readFileSync(CONTENT_FILE, "utf8"));
}

/** Atomic write: temp file + rename, so a crash never leaves a half-written file. */
function writeContent(data) {
  const tmp = CONTENT_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, CONTENT_FILE);
}

seedContent();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true, docs: safeCount() }));

function safeCount() {
  try { return readContent().length; } catch { return -1; }
}

// Public: current siddur content (frontend prefers this over the bundled blob).
app.get("/api/content", (_req, res) => {
  try {
    res.set("Cache-Control", "no-cache");
    res.json(readContent());
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Admin: replace the siddur content. Requires a matching admin token.
app.post("/api/content", requireAdmin, (req, res) => {
  const body = req.body;
  if (!Array.isArray(body)) {
    return res.status(400).json({ error: "expected a JSON array of docs" });
  }
  try {
    // Keep one timestamped backup so an admin can roll back a bad save.
    if (fs.existsSync(CONTENT_FILE)) {
      fs.copyFileSync(CONTENT_FILE, path.join(DATA_DIR, `content.${Date.now()}.bak.json`));
    }
    writeContent(body);
    res.json({ ok: true, docs: body.length });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: "ADMIN_TOKEN not configured on the server" });
  }
  if (req.get("X-Admin-Token") !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "invalid admin token" });
  }
  next();
}

// Site settings (splash branding, etc.) — public read, admin write.
app.get("/api/settings", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  try {
    res.json(fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) : {});
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/settings", requireAdmin, (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "expected a JSON object" });
  }
  try {
    const tmp = SETTINGS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(req.body));
    fs.renameSync(tmp, SETTINGS_FILE);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Let the client check whether admin writes are possible without leaking the token.
app.get("/api/admin/status", (_req, res) => res.json({ enabled: !!ADMIN_TOKEN }));

app.use(express.static(PUBLIC_DIR, { extensions: ["html"], maxAge: "1h" }));

// SPA-ish fallback: unknown non-API GET → index.html.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`The Super Siddur listening on :${PORT}`);
  if (!ADMIN_TOKEN) console.log("[warn] ADMIN_TOKEN is empty — admin saves are disabled.");
});
