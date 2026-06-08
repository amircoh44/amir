"use strict";
/* Admin extensions: live content editor (find/replace + missing-text report),
   splash-screen branding, and server sync. Builds on the helpers in 10-data.js
   and the admin panel in 40-admin.js. */

/* ===== server sync + auth (FastAPI backend; JWT bearer) ===== */
let _me = null; // current signed-in admin {email, role, permissions}
function authToken() { return (state.adminToken || "").trim(); }
function authHeader() { return authToken() ? { Authorization: "Bearer " + authToken() } : {}; }
function jsonHeaders() { return Object.assign({ "Content-Type": "application/json" }, authHeader()); }
function hasPerm(p) { return !!_me && (_me.role === "superadmin" || (_me.permissions || []).includes(p)); }

function fetchMe() {
  if (!authToken()) { _me = null; return Promise.resolve(); }
  return fetch("/api/auth/me", { headers: authHeader() })
    .then((r) => (r.ok ? r.json() : null)).then((m) => { _me = m; }).catch(() => { _me = null; });
}

/* Pull live content + settings + icon overrides from the server, and validate any saved session. */
function syncFromServer() {
  fetchMe();
  fetch("/api/content").then((r) => (r.ok ? r.json() : null)).then((data) => {
    if (Array.isArray(data) && data.length) {
      window.TEXTDATA = data; buildImported();
      const app = $("#app"); if (app && app.style.visibility !== "hidden") render();
    }
  }).catch(() => {});
  fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((cfg) => {
    if (!cfg) return;
    if (cfg.branding) { state.branding = cfg.branding; applySplash(); }
    if (cfg.audiences && Array.isArray(cfg.audiences.list)) { state.audienceDefs = cfg.audiences.list; }
    saveState();
    const app = $("#app"); if (app && app.style.visibility !== "hidden") render();
  }).catch(() => {});
  fetch("/api/icons").then((r) => (r.ok ? r.json() : [])).then((list) => {
    const m = {}; (list || []).forEach((i) => { m[i.key] = i.url; });
    window.ICON_OVERRIDES = m;
    const app = $("#app"); if (app && app.style.visibility !== "hidden") render();
  }).catch(() => {});
}

function saveContentToServer() {
  return fetch("/api/content", { method: "POST", headers: jsonHeaders(), body: JSON.stringify(window.TEXTDATA || []) })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })).catch(() => ({ ok: r.ok, j: {} })));
}
function saveSettingsToServer() {
  return fetch("/api/settings/branding", { method: "PUT", headers: jsonHeaders(), body: JSON.stringify({ value: state.branding || {} }) })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })).catch(() => ({ ok: r.ok, j: {} })));
}
/* Publish the custom-audience definitions to the server (admins with settings.edit). */
function publishAudiences() {
  if (!hasPerm("settings.edit")) return;
  fetch("/api/settings/audiences", { method: "PUT", headers: jsonHeaders(), body: JSON.stringify({ value: { list: state.audienceDefs || [] } }) })
    .then((r) => { if (r.ok) toast("Audiences published"); }).catch(() => {});
}

function publishBtnFlow(btn, fn, okMsg) {
  if (!_me) { toast("Sign in below to save to the server"); return; }
  const old = btn.textContent; btn.textContent = "Saving…"; btn.disabled = true;
  fn().then(({ ok, j }) => {
    btn.disabled = false; btn.textContent = old;
    toast(ok ? okMsg(j) : "Save failed: " + (j.detail || j.error || "permission denied"));
  }).catch(() => { btn.disabled = false; btn.textContent = old; toast("Save failed (offline?)"); });
}

function doLogin(email, password, btn) {
  if (!email || !password) { toast("Enter email and password"); return; }
  const old = btn.textContent; btn.textContent = "Signing in…"; btn.disabled = true;
  fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
    .then(({ ok, j }) => {
      btn.disabled = false; btn.textContent = old;
      if (ok && j.access_token) {
        state.adminToken = j.access_token; saveState();
        fetchMe().then(() => paintAdmin()); toast("Signed in");
      } else { toast("Sign in failed: " + (j.detail || "check credentials")); }
    }).catch(() => { btn.disabled = false; btn.textContent = old; toast("Sign in failed (offline?)"); });
}

/* Sign-in / identity block shown at the bottom of admin tabs that save to the server. */
function adminAuthField(w) {
  const f = el("div", "field"); f.style.marginTop = "1rem";
  if (_me) {
    f.innerHTML = `<label>Signed in</label>`;
    f.appendChild(el("div", "note", `${esc(_me.email)} — ${_me.role === "superadmin" ? "super admin (all permissions)" : (esc((_me.permissions || []).join(", ")) || "no permissions")}`));
    const out = el("button", "btn-ghost", "Sign out");
    out.onclick = () => { state.adminToken = ""; _me = null; saveState(); paintAdmin(); };
    f.appendChild(out); w.appendChild(f); return;
  }
  f.innerHTML = `<label>Admin sign in</label>`;
  const em = el("input"); em.type = "email"; em.placeholder = "email"; em.autocomplete = "username"; em.style.cssText = "width:100%;margin-bottom:.4rem";
  const pw = el("input"); pw.type = "password"; pw.placeholder = "password"; pw.autocomplete = "current-password"; pw.style.cssText = "width:100%;margin-bottom:.4rem";
  const btn = el("button", "btn-primary", "Sign in");
  btn.onclick = () => doLogin(em.value.trim(), pw.value, btn);
  pw.onkeydown = (e) => { if (e.key === "Enter") btn.click(); };
  f.appendChild(em); f.appendChild(pw); f.appendChild(btn);
  f.appendChild(el("div", "note", "Sign in to publish edits to the server for everyone. Super admins: amir@graphicatz.com, shalomlebowitz@gmail.com."));
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

  adminAuthField(w);
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
  adminAuthField(w);
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

/* ===== icon CMS: override built-in icons or add custom ones ===== */
const BUILTIN_ICON_KEYS = ["stand", "sit", "bow", "sun", "dusk", "moon", "food", "path", "star", "book"];

function uploadIcon(key, label, kind, file, btn) {
  if (!_me) { toast("Sign in to manage icons"); return; }
  if (!key) { toast("Enter an icon key"); return; }
  if (!file) { toast("Choose an image file"); return; }
  if (file.size > 2000000) { toast("Image too large (max ~2 MB)"); return; }
  const fd = new FormData();
  fd.append("key", key); fd.append("label", label || ""); fd.append("kind", kind);
  fd.append("file", file);
  const old = btn.textContent; btn.textContent = "Uploading…"; btn.disabled = true;
  fetch("/api/icons", { method: "POST", headers: authHeader(), body: fd })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
    .then(({ ok, j }) => {
      btn.disabled = false; btn.textContent = old;
      if (ok) { toast("Icon saved"); syncFromServer(); paintAdmin(); }
      else toast("Upload failed: " + (j.detail || "permission denied"));
    }).catch(() => { btn.disabled = false; btn.textContent = old; toast("Upload failed (offline?)"); });
}

function deleteIcon(key) {
  fetch("/api/icons/" + encodeURIComponent(key), { method: "DELETE", headers: authHeader() })
    .then((r) => { if (r.ok) { toast("Icon removed"); syncFromServer(); paintAdmin(); } else toast("Remove failed"); })
    .catch(() => toast("Remove failed"));
}

function admIcons(w) {
  w.appendChild(el("p", "note", "Upload a PNG/SVG to override a built-in icon (use its exact key) or add a new custom one. Built-in keys: " + BUILTIN_ICON_KEYS.join(", ") + "."));

  const f = el("div", "field");
  const key = el("input"); key.placeholder = "icon key (e.g. bow, sun, my_icon)"; key.style.cssText = "width:100%;margin-bottom:.4rem";
  const label = el("input"); label.placeholder = "label (optional)"; label.style.cssText = "width:100%;margin-bottom:.4rem";
  const kindSel = el("select"); kindSel.innerHTML = `<option value="override">Override a built-in icon</option><option value="custom">Add a custom icon</option>`; kindSel.style.cssText = "width:100%;margin-bottom:.4rem";
  const file = el("input"); file.type = "file"; file.accept = "image/png,image/svg+xml,image/jpeg,image/webp";
  f.appendChild(key); f.appendChild(label); f.appendChild(kindSel); f.appendChild(file);
  f.appendChild(el("div", "hint", "Square icon, recommended 64 × 64 px (min 32 × 32). Transparent PNG or SVG preferred; shown small, inline with the prayer text. PNG / SVG / JPG / WebP, under ~2 MB."));
  const up = el("button", "btn-primary", "Upload icon"); up.style.marginTop = ".5rem";
  up.onclick = () => uploadIcon(key.value.trim().toLowerCase(), label.value.trim(), kindSel.value, file.files[0], up);
  w.appendChild(f);

  fetch("/api/icons").then((r) => r.json()).then((list) => {
    const h = el("div", "field"); h.style.marginTop = "1rem";
    h.innerHTML = `<label>Custom & overridden icons — ${(list || []).length}</label>`; w.appendChild(h);
    (list || []).forEach((ic) => {
      const r = el("div", "arr-row");
      r.innerHTML = `<img src="${ic.url}" alt="${esc(ic.key)}" style="width:26px;height:26px;object-fit:contain;background:var(--surface2);border-radius:6px;padding:2px"><div class="nm" style="flex:1"><b>${esc(ic.key)}</b><small>${esc(ic.kind)}${ic.label ? " · " + esc(ic.label) : ""}</small></div>`;
      const rm = el("button", "arr-mini"); rm.style.color = "#d9534f";
      rm.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="width:1em"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
      rm.onclick = () => deleteIcon(ic.key);
      r.appendChild(rm); w.appendChild(r);
    });
    if (!(list || []).length) w.appendChild(el("div", "note", "No custom icons yet — the built-in icons are in use."));
  }).catch(() => {});

  adminAuthField(w);
}

/* ===== admin management (super admins only) ===== */
function admAdmins(w) {
  if (!_me) { w.appendChild(el("p", "note", "Sign in as a super admin to manage admins.")); adminAuthField(w); return; }
  if (_me.role !== "superadmin") { w.appendChild(el("p", "note", "Super admins only.")); return; }

  const PERMS = [["content.edit", "Edit content"], ["settings.edit", "Edit splash/settings"], ["icons.edit", "Manage icons"], ["admins.manage", "Manage admins"]];
  const f = el("div", "field");
  const em = el("input"); em.type = "email"; em.placeholder = "new admin email"; em.style.cssText = "width:100%;margin-bottom:.4rem";
  const nm = el("input"); nm.placeholder = "name (optional)"; nm.style.cssText = "width:100%;margin-bottom:.4rem";
  const pw = el("input"); pw.type = "password"; pw.placeholder = "temporary password (min 8 chars)"; pw.style.cssText = "width:100%;margin-bottom:.4rem";
  const roleSel = el("select"); roleSel.innerHTML = `<option value="editor">Editor (choose permissions)</option><option value="superadmin">Super admin (all permissions)</option>`; roleSel.style.cssText = "width:100%;margin-bottom:.5rem";
  const permWrap = el("div", ""); permWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem";
  const permState = {};
  PERMS.forEach(([p, lbl]) => {
    const b = el("button", ""); b.type = "button";
    const paint = () => { b.style.cssText = "padding:.35rem .6rem;border-radius:.5rem;font-size:.75rem;font-weight:600;cursor:pointer;border:1px solid " + (permState[p] ? "var(--accent)" : "var(--line)") + ";background:" + (permState[p] ? "color-mix(in srgb,var(--accent) 14%,transparent)" : "var(--surface2)") + ";color:" + (permState[p] ? "var(--accent)" : "var(--ink2)"); };
    b.textContent = lbl; paint(); b.onclick = () => { permState[p] = !permState[p]; paint(); };
    permWrap.appendChild(b);
  });
  f.appendChild(em); f.appendChild(nm); f.appendChild(pw); f.appendChild(roleSel);
  f.appendChild(el("div", "hint", "Editors only get the permissions you select below.")); f.appendChild(permWrap);
  const add = el("button", "btn-primary", "Create admin");
  add.onclick = () => {
    const perms = PERMS.filter(([p]) => permState[p]).map(([p]) => p);
    fetch("/api/admins", { method: "POST", headers: jsonHeaders(), body: JSON.stringify({ email: em.value.trim(), name: nm.value.trim(), password: pw.value, role: roleSel.value, permissions: perms }) })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (ok) { toast("Admin created"); paintAdmin(); } else toast("Failed: " + (j.detail || "check fields")); })
      .catch(() => toast("Failed (offline?)"));
  };
  f.appendChild(add); w.appendChild(f);

  fetch("/api/admins", { headers: authHeader() }).then((r) => r.json()).then((list) => {
    const h = el("div", "field"); h.style.marginTop = "1rem"; h.innerHTML = `<label>Admins — ${(list || []).length}</label>`; w.appendChild(h);
    (list || []).forEach((a) => {
      const r = el("div", "arr-row");
      r.innerHTML = `<div class="nm" style="flex:1"><b>${esc(a.email)}</b><small>${a.role === "superadmin" ? "super admin" : (a.permissions.join(", ") || "no permissions")}</small></div>`;
      if (a.role !== "superadmin" || (a.email !== "amir@graphicatz.com" && a.email !== "shalomlebowitz@gmail.com")) {
        const rm = el("button", "arr-mini"); rm.style.color = "#d9534f";
        rm.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="width:1em"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
        rm.onclick = () => fetch("/api/admins/" + a.id, { method: "DELETE", headers: authHeader() }).then((rr) => { if (rr.ok) { toast("Removed"); paintAdmin(); } else toast("Cannot remove"); });
        r.appendChild(rm);
      }
      w.appendChild(r);
    });
  }).catch(() => {});

  adminAuthField(w);
}

/* ===== hidden admin access: secret #admin URL, or 7 taps on the title =====
   Standard users see no admin options; the only way in is this hidden login. */
function openAdminLogin() {
  if (typeof _me !== "undefined" && _me) { if (typeof openAdmin === "function") openAdmin(); return; }
  const old = document.getElementById("adminLoginModal"); if (old) old.remove();
  const ov = el("div", ""); ov.id = "adminLoginModal";
  ov.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(8,6,4,.82);backdrop-filter:blur(8px);display:grid;place-items:center;padding:1.2rem";
  const card = el("div", ""); card.style.cssText = "width:100%;max-width:360px;background:var(--surface);border:1px solid var(--line2);border-radius:.85rem;padding:1.5rem;box-shadow:0 20px 60px -12px rgba(0,0,0,.7)";
  card.innerHTML = `<div style="font-family:var(--display);font-size:1.4rem;font-weight:600;color:var(--ink)">Admin sign in</div><div class="note" style="margin:.3rem 0 1.1rem">Restricted — authorized editors only.</div>`;
  const ip = "width:100%;padding:.75rem .8rem;background:var(--surface2);border:1px solid var(--line);border-radius:.55rem;color:var(--ink);font:inherit;margin-bottom:.55rem;outline:none";
  const em = el("input"); em.type = "email"; em.placeholder = "email"; em.autocomplete = "username"; em.style.cssText = ip;
  const pw = el("input"); pw.type = "password"; pw.placeholder = "password"; pw.autocomplete = "current-password"; pw.style.cssText = ip;
  const btn = el("button", "btn-primary", "Sign in"); btn.style.cssText = "width:100%;margin-top:.3rem";
  const cx = el("button", "btn-ghost", "Cancel"); cx.style.cssText = "width:100%;margin-top:.5rem";
  cx.onclick = () => ov.remove();
  function submit() {
    const o = btn.textContent; btn.textContent = "Signing in…"; btn.disabled = true;
    fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em.value.trim(), password: pw.value }) })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        btn.disabled = false; btn.textContent = o;
        if (ok && j.access_token) {
          state.adminToken = j.access_token; saveState();
          fetchMe().then(() => { ov.remove(); toast("Welcome, admin"); if (typeof render === "function") render(); if (typeof openAdmin === "function") openAdmin(); });
        } else { toast("Sign in failed: " + ((j && j.detail) || "check credentials")); }
      }).catch(() => { btn.disabled = false; btn.textContent = o; toast("Sign in failed (offline?)"); });
  }
  btn.onclick = submit; pw.onkeydown = (e) => { if (e.key === "Enter") submit(); };
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  card.appendChild(em); card.appendChild(pw); card.appendChild(btn); card.appendChild(cx); ov.appendChild(card); document.body.appendChild(ov);
  if (location.hash === "#admin") { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  setTimeout(() => em.focus(), 60);
}
window.openAdminLogin = openAdminLogin;
function _checkAdminHash() { if (location.hash === "#admin") openAdminLogin(); }
window.addEventListener("hashchange", _checkAdminHash);
(function wireHiddenAdmin() {
  const go = () => {
    _checkAdminHash();
    const brand = document.querySelector(".brand");
    if (brand && !brand._adminWired) {
      brand._adminWired = true; let taps = 0, t0 = 0;
      brand.addEventListener("click", () => { const now = Date.now(); if (now - t0 > 2500) taps = 0; t0 = now; taps++; if (taps >= 7) { taps = 0; openAdminLogin(); } });
    }
  };
  if (document.readyState !== "loading") setTimeout(go, 300); else document.addEventListener("DOMContentLoaded", () => setTimeout(go, 300));
})();
