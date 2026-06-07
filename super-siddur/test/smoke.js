"use strict";
/*
 * Smoke test for The Super Siddur.
 *
 *   cd super-siddur/test && npm install && npm test
 *
 * Boots the refactored app in jsdom and verifies: clean boot, the content
 * pipeline, the admin/editor + splash features, the themed Kotel line art, and
 * the kavanot-as-independent-blocks behaviour. If the original single-file HTML
 * is present (path in $SIDDUR_ORIG or the default upload path), it also asserts
 * byte-for-byte behavioural parity against it.
 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..", "public");
const ORIG = process.env.SIDDUR_ORIG ||
  "/root/.claude/uploads/8c953ba3-8825-539f-9a56-7792d3cfe66b/fa274102-siddur_v23.html";

let pass = 0, fail = 0; const diag = [];
const ok = (n, c, d) => { if (c) { pass++; console.log("  ✓ " + n); } else { fail++; console.log("  ✗ " + n); if (d) diag.push(n + " :: " + d); } };

function boot(scripts) {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id='cover'><div id='bookCover' class='cv'><div class='the'></div><div class='tt'></div><div class='heb'></div><div class='build'></div></div></div><div id='app' style='visibility:hidden'></div><main id='stage'></main><div id='admBody'></div><div id='admSheet'></div></body></html>",
    { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
  const { window } = dom;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, media: "" }));
  window.scrollTo = () => {}; window.navigator.vibrate = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.fetch = () => Promise.reject(new Error("offline")); // force fallback to bundled data
  window.localStorage.clear();
  const ctx = dom.getInternalVMContext(); const errors = [];
  for (const [name, src] of scripts) { try { vm.runInContext(src, ctx, { filename: name }); } catch (e) { errors.push(name + ": " + e.message); } }
  return { window, ctx, errors, dom };
}
/* Seed real module-scope `state` via localStorage + loadState() (it isn't a ctx global). */
function seed(R, obj) {
  R.window.localStorage.setItem("super_siddur_v23", JSON.stringify(Object.assign({ onboarded: true }, obj)));
  R.ctx.loadState();
}

const order = ["textdata.js", "05-hebcal.js", "00-engine.js", "10-data.js", "20-logic.js", "25-calendar.js", "30-views.js", "40-admin.js", "50-import.js", "60-adminx.js"];
const refSources = order.map((f) => [f, fs.readFileSync(path.join(ROOT, "js", f), "utf8")]);

console.log("\n[A] Refactored app boots");
const R = boot(refSources);
ok("no load errors", R.errors.length === 0, R.errors.join(" | "));
try { R.window.document.dispatchEvent(new R.window.Event("DOMContentLoaded")); ok("DOMContentLoaded ran", true); } catch (e) { ok("DOMContentLoaded ran", false, e.message); }

let O = null;
if (fs.existsSync(ORIG)) {
  console.log("\n[B] Original baseline boots");
  const oL = fs.readFileSync(ORIG, "utf8").split("\n");
  O = boot([["orig-data", oL[2784]], ["orig", '"use strict";\n' + oL[419].replace("<script>", "") + "\n" + oL.slice(420, 3038).join("\n")]]);
  ok("original boots clean", O.errors.length === 0, O.errors.join(" | "));

  console.log("\n[C] Parity vs original");
  const probes = [
    ["todayHeb", (c) => { const t = c.todayHeb(new Date(Date.UTC(2026, 5, 7))); return t.year + "|" + t.month + "|" + t.day; }],
    ["zmanim", (c) => { const z = c.computeZmanim(new Date(Date.UTC(2026, 5, 7)), { lat: 31.78, lng: 35.22, tz: "Asia/Jerusalem" }); return c.hmFmt(z.netz) + "/" + c.hmFmt(z.shkia); }],
    ["gematria", (c) => c.gematria(5786)],
    ["services", (c) => String(c.allServices().length)],
    ["bearingToKotel", (c) => String(Math.round(c.bearingToKotel(40.7, -74)))],
  ];
  probes.forEach(([n, fn]) => { let r, o; try { r = fn(R.ctx); } catch (e) { r = "E:" + e.message; } try { o = fn(O.ctx); } catch (e) { o = "E:" + e.message; } ok(n + " parity (ref=" + r + ")", r === o && !String(r).startsWith("E:"), "ref=" + r + " orig=" + o); });
} else {
  console.log("\n[B/C] (original HTML not present — skipping parity; set SIDDUR_ORIG to enable)");
}

console.log("\n[D] Content pipeline");
ok("TEXTDATA 11 docs", Array.isArray(R.window.TEXTDATA) && R.window.TEXTDATA.length === 11, "len=" + (R.window.TEXTDATA || []).length);
ok("IMPORTED >=4 services", R.window.IMPORTED && Object.keys(R.window.IMPORTED).length >= 4);

console.log("\n[E] Admin/editor + splash");
["admContent", "admSplash", "applySplash", "syncFromServer", "missingReport", "imageUploadField", "stageBranding"].forEach((fn) => ok(fn + " defined", typeof R.ctx[fn] === "function"));
try {
  R.ctx.stageBranding("title1", "Beit"); R.ctx.stageBranding("title2", "Tefillah"); R.ctx.stageBranding("subtitle", "shalom"); R.ctx.stageBranding("accent", "#ff0000");
  const D = R.window.document;
  ok("applySplash sets cover text", D.querySelector("#cover .cv .the").textContent === "Beit" && D.querySelector("#cover .cv .tt").textContent === "Tefillah" && D.querySelector("#cover .cv .build").textContent === "shalom");
  const st = D.querySelector("#cover .cv .the").style;
  ok("applySplash applies accent", /ff0000|rgb\(255, 0, 0\)|red/.test(st.color || st.webkitTextFillColor));
} catch (e) { ok("splash apply", false, e.message); }
try { const w = R.window.document.createElement("div"); R.ctx.admContent(w); ok("admContent inputs", !!(w.querySelector("#cxFind") && w.querySelector("#cxRep") && w.querySelector("#cxScope"))); ok("missing-text report", /Missing-text report/.test(w.textContent)); } catch (e) { ok("admContent", false, e.message); }
try {
  const w = R.window.document.createElement("div"); R.ctx.admSplash(w);
  const hints = [...w.querySelectorAll(".img-up .hint")];
  ok("2 image-upload fields", w.querySelectorAll(".img-up").length === 2);
  ok("upload hints state pixel sizes", hints.length === 2 && hints.every((h) => /px/.test(h.textContent)));
  ok("cover hint 1080 × 1440", /1080 × 1440/.test(w.textContent));
  ok("compass hint 1200 × 600", /1200 × 600/.test(w.textContent));
} catch (e) { ok("admSplash", false, e.message); }
try { const w = R.window.document.createElement("div"); R.ctx.admDisplay(w); ok("'Opening cover' user toggle", /Opening cover/.test(w.textContent)); } catch (e) { ok("admDisplay", false, e.message); }

console.log("\n[F] Kotel line art (themed, offline)");
try {
  const svg = R.ctx.kotelArtSVG();
  ok("kotelArtSVG returns <svg>", /^<svg/.test(svg));
  ok("uses var(--accent), no external image", /var\(--accent\)/.test(svg) && !/https?:|\.jpg|\.png|wikimedia/.test(svg));
  ok("engraved wordmark ירושלים + JERUSALEM", /ירושלים/.test(svg) && /JERUSALEM/.test(svg));
  ok("masonry has many joints", (svg.match(/<line/g) || []).length > 15);
  seed(R, { view: "kotel", loc: { name: "Bnei Brak", lat: 32.08, lng: 34.83 } });
  const stage = R.window.document.querySelector("#stage"); stage.innerHTML = ""; R.ctx.renderKotel(stage);
  ok("renders .kotel-art (not a photo)", !!stage.querySelector(".kotel-art") && !stage.querySelector(".kh-img"));
  ok("subtitle shows origin city", /Bnei Brak/i.test(stage.textContent));
  R.ctx.stageBranding("kotelImage", "data:image/png;base64,AAAA");
  stage.innerHTML = ""; R.ctx.renderKotel(stage);
  ok("admin image overrides line art", !!stage.querySelector(".kh-img"));
  R.ctx.stageBranding("kotelImage", "");
} catch (e) { ok("kotel art", false, e.message); }

console.log("\n[G] Kavanot as independent reorderable blocks");
try {
  const legacy = [{ k: "p", he: "שלום", kavanah: "focus here" }, { k: "rubric", text: "Stand" }, { k: "p", he: "ברוך", kav: { found: "f", halachic: "h" } }];
  const norm = R.ctx.normalizeBlocks(legacy);
  ok("legacy splits into separate kavanah blocks", norm.filter((b) => b.k === "kavanah").length === 2);
  ok("order preserved (p,kavanah,rubric,p,kavanah)", norm.map((b) => b.k).join(",") === "p,kavanah,rubric,p,kavanah");
  ok("text block kavanah detached", !norm[0].kavanah && !norm[0].kav);
  ok("kavanah block carries layers", norm[1].kav.found === "focus here" && norm[4].kav.found === "f" && norm[4].kav.halachic === "h");
  ok("normalizeBlocks idempotent", JSON.stringify(R.ctx.normalizeBlocks(norm)) === JSON.stringify(norm));
  seed(R, { showKavanot: true, kavLevels: { found: true, halachic: true, kabbalistic: true } });
  const reordered = [{ k: "kavanah", kav: { found: "first" } }, { k: "p", he: "טקסט" }];
  const wrap = R.window.document.createElement("div");
  R.ctx.normalizeBlocks(reordered).forEach((b) => R.ctx.renderBlockTo(b, wrap));
  const kids = [...wrap.children];
  const kavIdx = kids.findIndex((n) => (n.className || "").includes("kavanah-card"));
  const txtIdx = kids.findIndex((n) => (n.className || "").includes("block"));
  ok("kavanah renders ABOVE text when placed first", kavIdx >= 0 && txtIdx >= 0 && kavIdx < txtIdx, "kavIdx=" + kavIdx + " txtIdx=" + txtIdx);
} catch (e) { ok("kavanot separation", false, e.message); }

console.log("\n[H] Hebcal: parasha + holidays + sunset rollover + region gate");
try {
  ok("hebcal global loaded", typeof R.ctx.hebcal === "object" && !!R.ctx.hebcal.HebrewCalendar);
  // currentParasha() builds its own Date inside the ctx realm -> HDate accepts it
  seed(R, { israelMode: "diaspora" });
  const pGal = R.ctx.currentParasha();
  ok("currentParasha returns {en,he}", pGal && /Parashat|Pesach|Sukkot|Rosh|Yom/.test(pGal.en) && /[֐-׿]/.test(pGal.he), JSON.stringify(pGal));
  ok("ilFlag false in diaspora", R.ctx.ilFlag() === false);
  seed(R, { israelMode: "israel" });
  ok("ilFlag true in Israel", R.ctx.ilFlag() === true);
  ok("holidaysFor() callable", Array.isArray(R.ctx.holidaysFor()));
  ok("appNow/afterSunset defined", typeof R.ctx.appNow === "function" && typeof R.ctx.afterSunset === "function");
  // region gate on blockVisible
  seed(R, { israelMode: "diaspora", nusach: "ashkenaz" });
  ok("diaspora-only block visible in diaspora", R.ctx.blockVisible({ k: "p", he: "x", region: "diaspora" }) === true);
  seed(R, { israelMode: "israel", nusach: "ashkenaz" });
  ok("diaspora-only block hidden in Israel", R.ctx.blockVisible({ k: "p", he: "x", region: "diaspora" }) === false);
  ok("israel-only block hidden in diaspora", (seed(R, { israelMode: "diaspora" }), R.ctx.blockVisible({ k: "p", he: "x", region: "israel" })) === false);
  ok("'diaspora_only' tag also gates", (seed(R, { israelMode: "israel" }), R.ctx.blockVisible({ k: "p", he: "x", tags: ["diaspora_only"] })) === false);
} catch (e) { ok("hebcal/region", false, e.message); }

console.log("\n[I] Visibility conditions: gender / minyan / audiences + per-block icons");
try {
  // gender gating: unset shows both; set hides the mismatched blessing
  seed(R, { gender: "" });
  ok("unset gender shows men's blessing",  R.ctx.blockVisible({ k: "p", he: "shelo asani isha", cond: { gender: "male" } }) === true);
  ok("unset gender shows women's blessing", R.ctx.blockVisible({ k: "p", he: "she'asani kirtzono", cond: { gender: "female" } }) === true);
  seed(R, { gender: "male" });
  ok("man sees men's blessing",  R.ctx.blockVisible({ k: "p", he: "x", cond: { gender: "male" } }) === true);
  ok("man HIDES women's blessing", R.ctx.blockVisible({ k: "p", he: "x", cond: { gender: "female" } }) === false);
  seed(R, { gender: "female" });
  ok("woman sees women's blessing", R.ctx.blockVisible({ k: "p", he: "x", cond: { gender: "female" } }) === true);
  ok("woman HIDES men's blessing",  R.ctx.blockVisible({ k: "p", he: "x", cond: { gender: "male" } }) === false);
  // minyan
  seed(R, { minyan: false });
  ok("requires-minyan hidden w/o minyan", R.ctx.blockVisible({ k: "p", he: "x", cond: { minyan: true } }) === false);
  seed(R, { minyan: true });
  ok("requires-minyan shown w/ minyan", R.ctx.blockVisible({ k: "p", he: "x", cond: { minyan: true } }) === true);
  // custom audiences: membership required
  seed(R, { audiences: { kohen: true } });
  ok("kohen-only shown to a kohen", R.ctx.blockVisible({ k: "p", he: "x", cond: { audiences: ["kohen"] } }) === true);
  seed(R, { audiences: {} });
  ok("kohen-only hidden from non-kohen", R.ctx.blockVisible({ k: "p", he: "x", cond: { audiences: ["kohen"] } }) === false);
  // combined facets (all must hold)
  seed(R, { gender: "male", israelMode: "israel" });
  ok("combined cond all-true", R.ctx.blockVisible({ k: "p", he: "x", cond: { gender: "male", region: "israel" } }) === true);
  ok("combined cond one-false", R.ctx.blockVisible({ k: "p", he: "x", cond: { gender: "male", region: "diaspora" } }) === false);
  // per-block icon honours its own condition
  seed(R, { gender: "female" });
  ok("icon hidden when its cond fails", R.ctx.blockIconHtml({ key: "bow", cond: { gender: "male" } }) === "");
  ok("icon shown when its cond passes", /svg|img/.test(R.ctx.blockIconHtml({ key: "bow", cond: { gender: "female" } })));
  // buildImported carries cond/icon from TEXTDATA into render blocks
  R.ctx.window.TEXTDATA = [{ nusach: "ashkenaz", svcId: "birchot", service: "Birchot", sections: [
    { header: "h", blocks: [{ k: "p", t: "ברוך", cond: { gender: "female" }, icon: { key: "bow" } }] } ] }];
  R.ctx.buildImported();
  const imp = R.ctx.window.IMPORTED.birchot[0].blocks[0];
  ok("buildImported preserves cond", imp.cond && imp.cond.gender === "female");
  ok("buildImported preserves icon", imp.icon && imp.icon.key === "bow");
} catch (e) { ok("conditions", false, e.message); }

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (diag.length) console.log("\n--- diagnostics ---\n" + diag.join("\n"));
process.exit(fail ? 1 : 0);
