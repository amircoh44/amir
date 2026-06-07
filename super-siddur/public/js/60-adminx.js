"use strict";
/* Admin extensions: live content editor (find/replace + missing-text report),
   splash-screen branding, and server sync. Builds on the helpers in 10-data.js
   and the admin panel in 40-admin.js. */

/* ===== server sync ===== */
let _serverAdmin = false;
function adminToken() { return (state.adminToken || "").trim(); }
function adminHeaders() { return { "Content-Type": "application/json", "X-Admin-Token": adminToken() }; }

/* Pull live content (admin edits) + settings (splash) from the server, if available. */
function syncFromServer() {
  fetch("/api/admin/status").then((r) => r.json()).then((s) => { _serverAdmin = !!s.enabled; }).catch(() => {});
  fetch("/api/content").then((r) => (r.ok ? r.json() : null)).then((data) => {
    if (Array.isArray(data) && data.length) {
      window.TEXTDATA = data;
      buildImported();
      const app = $("#app");
      if (app && app.style.visibility !== "hidden") render();
    }
  }).catch(() => {});
  fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((cfg) => {
    if (cfg && cfg.branding) { state.branding = cfg.branding; saveState(); applySplash(); }
  }).catch(() => {});
}

function saveContentToServer() {
  return fetch("/api/content", { method: "POST", headers: adminHeaders(), body: JSON.stringify(window.TEXTDATA || []) })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })));
}
function saveSettingsToServer() {
  return fetch("/api/settings", { method: "POST", headers: adminHeaders(), body: JSON.stringify({ branding: state.branding || null }) })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })));
}

function publishBtnFlow(btn, fn, okMsg) {
  if (!adminToken()) { toast("Enter your admin token first"); return; }
  const old = btn.textContent; btn.textContent = "Saving…"; btn.disabled = true;
  fn().then(({ ok, j }) => {
    btn.disabled = false; btn.textContent = old;
    toast(ok ? okMsg(j) : "Save failed: " + (j.error || "server error"));
  }).catch(() => { btn.disabled = false; btn.textContent = old; toast("Save failed (offline?)"); });
}

/* Shared admin-token input used by both new tabs. */
function adminTokenField(w) {
  const f = el("div", "field"); f.style.marginTop = "1rem";
  f.innerHTML = `<label>Admin token — for saving to the server</label>`;
  const inp = el("input"); inp.type = "password"; inp.value = state.adminToken || "";
  inp.placeholder = _serverAdmin ? "Enter the server's admin token" : "Server saves not enabled";
  inp.style.cssText = "width:100%";
  inp.oninput = () => { state.adminToken = inp.value; saveState(); };
  f.appendChild(inp);
  f.appendChild(el("div", "note", _serverAdmin
    ? "Stored on this device only and sent with each save."
    : "This server has no ADMIN_TOKEN set — edits persist locally on each device only."));
  w.appendChild(f);
}

/* ===== splash branding ===== */
const SPLASH_DEFAULT = { title1: "The Super", title2: "Siddur", subtitle: "A space to pray", bgImage: "", accent: "" };
function splashCfg() { return Object.assign({}, SPLASH_DEFAULT, state.branding || {}); }

/* Apply the current branding to the cover DOM. */
function applySplash() {
  const c = splashCfg();
  const setT = (sel, txt) => { const n = document.querySelector(sel); if (n) n.textContent = txt; };
  setT("#cover .cv .the", c.title1);
  setT("#cover .cv .tt", c.title2);
  setT("#cover .cv .build", c.subtitle);
  const bc = $("#bookCover");
  if (!bc) return;
  bc.style.backgroundSize = "cover"; bc.style.backgroundPosition = "center";
  bc.style.backgroundImage = c.bgImage ? `url("${c.bgImage}")` : "";
  bc.querySelectorAll(".the,.tt,.heb").forEach((n) => {
    if (c.accent) { n.style.background = "none"; n.style.webkitTextFillColor = c.accent; n.style.color = c.accent; }
    else { n.style.background = ""; n.style.webkitTextFillColor = ""; n.style.color = ""; }
  });
}

function stageBranding(key, val) {
  state.branding = Object.assign({}, state.branding || {}, { [key]: val });
  saveState(); applySplash();
  if (key === "kotelImage" && typeof render === "function" && state.view === "kotel") render();
}

/* Reusable admin image upload (URL or file→data-URL) with a pixel-size hint
   underneath, so the line art can be replaced with a photo for any layout. */
function imageUploadField(w, label, key, hint) {
  const cur = splashCfg()[key] || "";
  const f = el("div", "field img-up"); f.innerHTML = `<label>${label}</label>`;
  const url = el("input"); url.type = "text"; url.placeholder = "https://… image URL";
  url.value = cur && !cur.startsWith("data:") ? cur : "";
  url.style.cssText = "width:100%;margin-bottom:.5rem";
  url.oninput = () => stageBranding(key, url.value);
  const file = el("input"); file.type = "file"; file.accept = "image/*";
  file.onchange = (e) => {
    const fl = e.target.files[0]; if (!fl) return;
    if (fl.size > 1800000) { toast("Image too large (max ~1.8 MB)"); return; }
    const rd = new FileReader();
    rd.onload = () => { stageBranding(key, rd.result); paintAdmin(); toast("Image loaded"); };
    rd.readAsDataURL(fl);
  };
  f.appendChild(url); f.appendChild(file);
  f.appendChild(el("div", "hint", hint));
  if (cur) {
    const th = el("div", "thumb"); th.style.backgroundImage = `url("${cur}")`; f.appendChild(th);
    const clr = el("button", "btn-ghost", "Remove image"); clr.style.margin = ".5rem 0 0";
    clr.onclick = () => { stageBranding(key, ""); paintAdmin(); };
    f.appendChild(clr);
  }
  w.appendChild(f);
}

function admSplash(w) {
  const c = splashCfg();
  w.appendChild(el("p", "note", "Customize the opening cover. <b>Apply</b> previews on this device; <b>Save for everyone</b> publishes to the server."));

  const textField = (label, key, ph) => {
    const f = el("div", "field"); f.innerHTML = `<label>${label}</label>`;
    const inp = el("input"); inp.type = "text"; inp.value = c[key] || ""; inp.placeholder = ph || "";
    inp.style.cssText = "width:100%";
    inp.oninput = () => stageBranding(key, inp.value);
    f.appendChild(inp); w.appendChild(f);
  };
  textField("Title line 1", "title1", "The Super");
  textField("Title line 2", "title2", "Siddur");
  textField("Subtitle", "subtitle", "A space to pray");
  textField("Accent color (hex, optional)", "accent", "#d4a854");

  imageUploadField(w, "Cover background image", "bgImage",
    "Portrait, 3:4 ratio. Recommended 1080 × 1440 px (minimum 720 × 960). Shown full-bleed behind the opening cover on phone and desktop. JPG / PNG / WebP, under ~1.8 MB. Leave empty to keep the line-art cover.");
  imageUploadField(w, "Compass header image", "kotelImage",
    "Wide banner, 2:1 ratio. Recommended 1200 × 600 px (minimum 720 × 360). Replaces the Kotel line-art header on the Compass screen. JPG / PNG / WebP, under ~1.8 MB. Leave empty to keep the themed line art.");

  const row = el("div", ""); row.style.cssText = "display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.8rem";
  const apply = el("button", "btn-ghost", "Apply (this device)"); apply.onclick = () => { saveState(); applySplash(); toast("Splash updated"); };
  const save = el("button", "btn-ghost", "Save for everyone");
  save.onclick = () => publishBtnFlow(save, saveSettingsToServer, () => "Published splash to everyone");
  const reset = el("button", "btn-ghost", "Reset to default");
  reset.onclick = () => { state.branding = null; saveState(); applySplash(); paintAdmin(); toast("Reset to default cover"); };
  row.appendChild(apply); row.appendChild(save); row.appendChild(reset); w.appendChild(row);

  const pv = el("button", "btn-primary", "Preview cover"); pv.style.marginTop = ".6rem";
  pv.onclick = () => { applySplash(); closeSheet("admSheet"); const cover = $("#cover"); if (cover) { cover.classList.remove("gone", "lifting"); const bc = $("#bookCover"); if (bc) bc.classList.remove("open"); } };
  w.appendChild(pv);

  adminTokenField(w);
}

/* ===== content editor: find/replace + missing-text report ===== */
function admContent(w) {
  w.appendChild(el("p", "note", "Edit the imported siddur text across nuschaot. Changes apply live; <b>Save to server</b> publishes for everyone. Per-prayer editing lives under the <b>Edit</b> tab."));

  const scope = el("div", "field");
  scope.innerHTML = `<label>Scope</label><select id="cxScope"><option value="__all__">All nuschaot</option>${Object.keys(NUSACH_LABELS).map((k) => `<option value="${k}"${state.nusach === k ? " selected" : ""}>${NUSACH_LABELS[k]}</option>`).join("")}</select>`;
  w.appendChild(scope);

  const mkInput = (label, id) => {
    const f = el("div", "field"); f.innerHTML = `<label>${label}</label>`;
    const inp = el("input"); inp.type = "text"; inp.id = id;
    inp.style.cssText = "width:100%;font-family:var(--hebrew);direction:rtl;font-size:1.05rem";
    f.appendChild(inp); w.appendChild(f); return inp;
  };
  const find = mkInput("Find", "cxFind");
  const rep = mkInput("Replace with", "cxRep");

  const optRow = el("div", "adm-row"); optRow.innerHTML = `<div class="lbl"><b>Match case</b></div>`;
  const mc = el("button", "switch"); optRow.appendChild(mc); w.appendChild(optRow);

  const cnt = el("div", "note", ""); w.appendChild(cnt);

  const scopeDocs = () => { const s = $("#cxScope").value; return (window.TEXTDATA || []).filter((d) => s === "__all__" || d.nusach === s); };
  const buildRe = () => {
    const f = find.value; if (!f) return null;
    const flags = (mc.classList.contains("on") ? "" : "i") + "gu";
    try { return new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags); } catch (e) { return null; }
  };
  const eachBlock = (docs, fn) => docs.forEach((d) => (d.sections || []).forEach((s) => (s.blocks || []).forEach((b) => fn(b))));
  const recount = () => {
    const re = buildRe(); if (!re) { cnt.textContent = ""; return; }
    let n = 0; eachBlock(scopeDocs(), (b) => { if (b.t) { const m = b.t.match(re); if (m) n += m.length; } });
    cnt.innerHTML = `<b style="color:var(--accent)">${n}</b> match${n === 1 ? "" : "es"}`;
  };
  find.oninput = recount;
  mc.onclick = () => { mc.classList.toggle("on"); recount(); };

  const row = el("div", ""); row.style.cssText = "display:flex;gap:.5rem;flex-wrap:wrap;margin:.7rem 0";
  const repBtn = el("button", "btn-ghost", "Replace all");
  repBtn.onclick = () => {
    const re = buildRe(); if (!re) { toast("Enter a search term"); return; }
    let n = 0; eachBlock(scopeDocs(), (b) => { if (b.t) b.t = b.t.replace(re, () => { n++; return rep.value; }); });
    buildImported(); render(); recount();
    toast(n + " replacement" + (n === 1 ? "" : "s"));
  };
  const saveBtn = el("button", "btn-primary", "Save to server"); saveBtn.style.cssText = "width:auto;margin:0";
  saveBtn.onclick = () => publishBtnFlow(saveBtn, saveContentToServer, (j) => "Saved " + (j.docs || "") + " docs to server");
  row.appendChild(repBtn); row.appendChild(saveBtn); w.appendChild(row);
  recount();

  missingReport(w);
  adminTokenField(w);
}

/* Sections with no non-empty text — the "missing text" report. */
function missingReport(w) {
  const docs = window.TEXTDATA || [];
  const miss = [];
  docs.forEach((d) => (d.sections || []).forEach((s, i) => {
    const has = (s.blocks || []).some((b) => b.t && b.t.trim());
    if (!has) miss.push({ nusach: d.nusach, service: d.service, header: s.header || `(untitled section #${i + 1})` });
  }));
  const h = el("div", "field"); h.style.marginTop = "1.2rem";
  h.innerHTML = `<label>Missing-text report — ${miss.length} empty section${miss.length === 1 ? "" : "s"}</label>`;
  w.appendChild(h);
  if (!miss.length) { w.appendChild(el("div", "note", "Every section has text. ✓")); return; }
  const list = el("div", ""); list.style.cssText = "max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:.55rem";
  miss.slice(0, 200).forEach((m) => {
    const r = el("div", ""); r.style.cssText = "padding:.5rem .7rem;border-bottom:1px solid var(--line);font-size:.85rem";
    r.innerHTML = `<span style="color:var(--accent);font-size:.7rem">${esc(NUSACH_LABELS[m.nusach] || m.nusach)}</span> · ${esc(m.service)} <span style="font-family:var(--hebrew)">${esc(m.header)}</span>`;
    list.appendChild(r);
  });
  w.appendChild(list);
}
