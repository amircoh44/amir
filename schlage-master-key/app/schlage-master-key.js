/* =============================================================================
 * Schlage Master Key System Designer
 * -----------------------------------------------------------------------------
 * A self-mounting, dependency-light master-keying calculator for locksmiths.
 *
 * It designs a master key system (Top Master Key + change keys, with an
 * optional Grand Master Key), generates the change keys using Total Position
 * Progression with two-step progression, validates against MACS, detects key
 * interchange / phantom-key cross-keying, computes the pin stack for every
 * cylinder, and exports a multi-page set of PDF pinning / cut sheets.
 *
 * Requires (loaded by the host page): jsPDF (window.jspdf.jsPDF) and the
 * jspdf-autotable plugin. The app mounts into the element with id "smk-app".
 *
 * Lock conventions (Schlage Classic defaults):
 *   - Depth numbers 0-9, higher number = deeper cut (.015" per increment).
 *   - Bottom pin number == cut depth number; master (build-up) pins == the
 *     difference between adjacent operating cut depths in a chamber.
 *   - MACS (Maximum Adjacent Cut Specification) = 7.
 *   - Two-step progression keeps every master pin even and >= 2 increments.
 * ===========================================================================*/
(function () {
  "use strict";

  // ---- Defaults ------------------------------------------------------------
  var DEFAULTS = {
    chambers: 6,
    minDepth: 0,
    maxDepth: 9,
    macs: 7,
    parity: "even",   // even | odd
    tmk: "624860",
    changeKeys: 12
  };

  // ---- State ---------------------------------------------------------------
  var system = null; // last generated system

  // ---- Small helpers -------------------------------------------------------
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function intArr(s) { return String(s).replace(/[^0-9]/g, "").split("").map(Number); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = "0" + s; return s; }

  // Pool of usable depths for the chosen parity within [min,max].
  function depthPool(min, max, parity) {
    var pool = [];
    for (var d = min; d <= max; d++) {
      if (parity === "even" && d % 2 === 0) pool.push(d);
      else if (parity === "odd" && d % 2 === 1) pool.push(d);
    }
    return pool;
  }

  // MACS check: no two adjacent chambers differ by more than `macs`.
  function macsOK(bitting, macs) {
    for (var i = 1; i < bitting.length; i++) {
      if (Math.abs(bitting[i] - bitting[i - 1]) > macs) return false;
    }
    return true;
  }

  function snapToPool(bitting, pool) {
    // Snap each depth to the nearest available pool depth (keeps user input usable).
    return bitting.map(function (d) {
      var best = pool[0], bestDist = Infinity;
      pool.forEach(function (p) {
        var dist = Math.abs(p - d);
        if (dist < bestDist) { bestDist = dist; best = p; }
      });
      return best;
    });
  }

  // Generate a random valid bitting from the pool that satisfies MACS.
  function randomBitting(chambers, pool, macs) {
    for (var attempt = 0; attempt < 500; attempt++) {
      var b = [];
      for (var c = 0; c < chambers; c++) {
        if (c === 0) {
          b.push(pool[Math.floor(Math.random() * pool.length)]);
        } else {
          // pick a depth within MACS of the previous one
          var prev = b[c - 1];
          var ok = pool.filter(function (p) { return Math.abs(p - prev) <= macs; });
          b.push(ok[Math.floor(Math.random() * ok.length)]);
        }
      }
      if (macsOK(b, macs)) return b;
    }
    return snapToPool([0,0,0,0,0,0].slice(0, chambers), pool);
  }

  // Operating-depth set per chamber for a cylinder operated by `keys`
  // (each key is a bitting array). Returns array of sorted unique depth arrays.
  function operatingSets(keys, chambers) {
    var sets = [];
    for (var c = 0; c < chambers; c++) {
      var seen = {};
      keys.forEach(function (k) { seen[k[c]] = true; });
      sets.push(Object.keys(seen).map(Number).sort(function (a, b) { return a - b; }));
    }
    return sets;
  }

  // Pin stack per chamber from operating depths: bottom pin + master pins.
  function pinning(sets) {
    return sets.map(function (depths) {
      var bottom = depths[0];
      var masters = [];
      for (var i = 1; i < depths.length; i++) masters.push(depths[i] - depths[i - 1]);
      return { bottom: bottom, masters: masters, depths: depths };
    });
  }

  // Does bitting `b` operate a cylinder whose per-chamber operating sets are `sets`?
  // True iff every chamber depth of b is present in that chamber's set.
  function operates(b, sets) {
    for (var c = 0; c < b.length; c++) {
      if (sets[c].indexOf(b[c]) === -1) return false;
    }
    return true;
  }

  // Count of theoretical keys that operate this cylinder (intended + phantom).
  function phantomCount(sets) {
    return sets.reduce(function (acc, s) { return acc * s.length; }, 1);
  }

  // -------------------------------------------------------------------------
  // Core: generate the master key system
  // -------------------------------------------------------------------------
  function generate(cfg) {
    var pool = depthPool(cfg.minDepth, cfg.maxDepth, cfg.parity);
    if (pool.length < 2) {
      return { error: "The depth range and parity leave fewer than 2 usable cut depths. Widen the range or switch parity." };
    }

    var tmk = snapToPool(cfg.tmk.slice(0, cfg.chambers), pool);
    while (tmk.length < cfg.chambers) tmk.push(pool[0]);
    if (!macsOK(tmk, cfg.macs)) {
      return { error: "The Top Master Key bitting " + tmk.join("") + " violates MACS (" + cfg.macs + "). Adjust adjacent cuts or auto-generate one." };
    }

    var gmk = null;
    if (cfg.gmkEnabled) {
      if (!cfg.gmk.length) {
        return { error: "Grand Master Key is enabled but no GMK bitting was entered. Type one or press “Auto-generate GMK”." };
      }
      gmk = snapToPool(cfg.gmk.slice(0, cfg.chambers), pool);
      while (gmk.length < cfg.chambers) gmk.push(pool[0]);
      if (!macsOK(gmk, cfg.macs)) {
        return { error: "The Grand Master Key bitting " + gmk.join("") + " violates MACS (" + cfg.macs + ")." };
      }
    }

    // Always-operating keys for every cylinder (top of the hierarchy).
    var topKeys = [tmk];
    if (gmk) topKeys.push(gmk);

    // Theoretical maximum number of distinct change keys in this space.
    var theoreticalMax = Math.pow(pool.length, cfg.chambers);

    // Odometer over chambers (mixed radix, base = pool.length). Rightmost
    // chamber progresses fastest — classic constant/right-hand progression.
    var radix = pool.length;
    var want = clamp(cfg.changeKeys, 1, 4000);
    var changeKeys = [];
    var cylinders = []; // { key, operatingSets }
    var skippedInterchange = 0;
    var total = theoreticalMax;

    for (var idx = 0; idx < total && changeKeys.length < want; idx++) {
      // decode idx -> bitting
      var rem = idx, bit = new Array(cfg.chambers);
      for (var c = cfg.chambers - 1; c >= 0; c--) { bit[c] = pool[rem % radix]; rem = Math.floor(rem / radix); }

      // must be a valid, distinct change key
      if (!macsOK(bit, cfg.macs)) continue;
      if (sameBitting(bit, tmk)) continue;          // change key can't equal TMK
      if (gmk && sameBitting(bit, gmk)) continue;    // ...or the GMK

      // candidate cylinder operating sets = top keys + this change key
      var candSets = operatingSets(topKeys.concat([bit]), cfg.chambers);

      // ---- interchange / cross-keying guard ----
      // Reject if this change key would operate an already-issued cylinder,
      // or if an already-issued change key would operate this candidate.
      var bad = false;
      for (var j = 0; j < cylinders.length && !bad; j++) {
        if (operates(bit, cylinders[j].sets)) bad = true;             // cand opens existing cyl
        else if (operates(cylinders[j].key, candSets)) bad = true;    // existing key opens cand cyl
      }
      if (bad) { skippedInterchange++; continue; }

      changeKeys.push(bit);
      cylinders.push({ key: bit, sets: candSets });
    }

    // Build per-cylinder pinning + phantom analysis.
    var rows = cylinders.map(function (cyl, i) {
      var pins = pinning(cyl.sets);
      var phantoms = phantomCount(cyl.sets);
      return {
        id: keyId(i),
        key: cyl.key,
        pins: pins,
        phantoms: phantoms,
        incidental: phantoms - (1 + 1 + (gmk ? 1 : 0)) // minus TMK, this change key, (GMK)
      };
    });

    return {
      cfg: cfg,
      pool: pool,
      tmk: tmk,
      gmk: gmk,
      changeKeys: changeKeys,
      rows: rows,
      theoreticalMax: theoreticalMax,
      requested: want,
      delivered: changeKeys.length,
      skippedInterchange: skippedInterchange
    };
  }

  function sameBitting(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function keyId(i) {
    // 1A, 1B ... 1Z, 2A ... style change-key stamps
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var group = Math.floor(i / 26) + 1;
    return group + letters[i % 26];
  }

  // pin stack -> compact text e.g. "B2 · M4" or "B2 · M2 · M2"
  function pinText(p) {
    var parts = ["B" + p.bottom];
    p.masters.forEach(function (m) { parts.push("M" + m); });
    return parts.join(" · ");
  }

  // =========================================================================
  // UI
  // =========================================================================
  function mount(root) {
    root.innerHTML = "";

    root.appendChild(el(
      '<div class="smk-header">' +
        '<div class="smk-logo">S</div>' +
        '<div>' +
          '<h1>Master Key System Designer</h1>' +
          '<div class="smk-sub">Schlage-spec pinning &amp; progression &middot; generates a printable PDF cut-sheet set</div>' +
        '</div>' +
      '</div>'
    ));

    var grid = el('<div class="smk-grid"></div>');
    root.appendChild(grid);

    // ---- left: config panel ----
    var form = el('<div></div>');
    form.appendChild(el(
      '<div class="smk-panel">' +
        '<h2>System Details</h2>' +
        '<div class="smk-field"><label>System / job name</label><input type="text" id="smk-name" placeholder="e.g. Riverside Office Tower"></div>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Customer</label><input type="text" id="smk-customer" placeholder="Customer"></div>' +
          '<div class="smk-field"><label>Technician</label><input type="text" id="smk-tech" placeholder="Your name"></div>' +
        '</div>' +
      '</div>'
    ));
    form.appendChild(el(
      '<div class="smk-panel">' +
        '<h2>Cylinder Spec</h2>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Pin chambers</label><input type="number" id="smk-chambers" min="4" max="7" value="' + DEFAULTS.chambers + '"></div>' +
          '<div class="smk-field"><label>MACS</label><input type="number" id="smk-macs" min="1" max="9" value="' + DEFAULTS.macs + '"></div>' +
        '</div>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Shallowest cut</label><input type="number" id="smk-min" min="0" max="9" value="' + DEFAULTS.minDepth + '"></div>' +
          '<div class="smk-field"><label>Deepest cut</label><input type="number" id="smk-max" min="0" max="9" value="' + DEFAULTS.maxDepth + '"></div>' +
          '<div class="smk-field"><label>Progression</label><select id="smk-parity"><option value="even">Two-step (even)</option><option value="odd">Two-step (odd)</option></select></div>' +
        '</div>' +
        '<div class="smk-note">Two-step progression keeps every master pin even and at least .030&Prime; (2 increments) for reliable wafers.</div>' +
      '</div>'
    ));
    form.appendChild(el(
      '<div class="smk-panel">' +
        '<h2>Keying</h2>' +
        '<div class="smk-field"><label>Top Master Key (TMK) bitting</label>' +
          '<input type="text" id="smk-tmk" class="smk-bitting" value="' + DEFAULTS.tmk + '" maxlength="7">' +
          '<div class="smk-btnbar"><button class="smk-btn smk-btn-ghost" id="smk-gen-tmk" type="button">Auto-generate TMK</button></div>' +
        '</div>' +
        '<div class="smk-field smk-check"><input type="checkbox" id="smk-gmk-on"><label style="margin:0">Add a Grand Master Key (3-level system)</label></div>' +
        '<div class="smk-field" id="smk-gmk-wrap" style="display:none"><label>Grand Master Key bitting</label>' +
          '<input type="text" id="smk-gmk" class="smk-bitting" value="" maxlength="7">' +
          '<div class="smk-btnbar"><button class="smk-btn smk-btn-ghost" id="smk-gen-gmk" type="button">Auto-generate GMK</button></div>' +
        '</div>' +
        '<div class="smk-field"><label>Change keys needed</label><input type="number" id="smk-ck" min="1" max="2000" value="' + DEFAULTS.changeKeys + '"></div>' +
        '<button class="smk-btn smk-btn-primary" id="smk-generate" type="button">Generate System</button>' +
      '</div>'
    ));
    grid.appendChild(form);

    // ---- right: results panel ----
    var out = el('<div class="smk-panel" id="smk-out"></div>');
    out.appendChild(el('<div class="smk-empty">Configure the system on the left, then press <b>Generate System</b>.</div>'));
    grid.appendChild(out);

    root.appendChild(el(
      '<div class="smk-foot">For authorized locksmithing use. Always verify the first cylinder by hand before pinning a full system. ' +
      'Pin numbers follow Schlage-Classic convention (bottom pin&nbsp;#&nbsp;=&nbsp;cut depth, .015&Prime; increments).</div>'
    ));

    wire(root);
  }

  function wire(root) {
    $("#smk-gmk-on", root).addEventListener("change", function (e) {
      $("#smk-gmk-wrap", root).style.display = e.target.checked ? "" : "none";
    });
    $("#smk-gen-tmk", root).addEventListener("click", function () {
      var cfg = readConfig(root);
      var pool = depthPool(cfg.minDepth, cfg.maxDepth, cfg.parity);
      if (pool.length) $("#smk-tmk", root).value = randomBitting(cfg.chambers, pool, cfg.macs).join("");
    });
    $("#smk-gen-gmk", root).addEventListener("click", function () {
      var cfg = readConfig(root);
      var pool = depthPool(cfg.minDepth, cfg.maxDepth, cfg.parity);
      if (pool.length) $("#smk-gmk", root).value = randomBitting(cfg.chambers, pool, cfg.macs).join("");
    });
    $("#smk-generate", root).addEventListener("click", function () { runGenerate(root); });
  }

  function readConfig(root) {
    var chambers = clamp(parseInt($("#smk-chambers", root).value, 10) || DEFAULTS.chambers, 4, 7);
    var minD = clamp(parseInt($("#smk-min", root).value, 10), 0, 9);
    var maxD = clamp(parseInt($("#smk-max", root).value, 10), 0, 9);
    if (maxD < minD) { var t = maxD; maxD = minD; minD = t; }
    return {
      name: $("#smk-name", root).value.trim(),
      customer: $("#smk-customer", root).value.trim(),
      tech: $("#smk-tech", root).value.trim(),
      chambers: chambers,
      minDepth: minD,
      maxDepth: maxD,
      macs: clamp(parseInt($("#smk-macs", root).value, 10) || DEFAULTS.macs, 1, 9),
      parity: $("#smk-parity", root).value === "odd" ? "odd" : "even",
      tmk: intArr($("#smk-tmk", root).value),
      gmkEnabled: $("#smk-gmk-on", root).checked,
      gmk: intArr($("#smk-gmk", root).value),
      changeKeys: clamp(parseInt($("#smk-ck", root).value, 10) || DEFAULTS.changeKeys, 1, 2000)
    };
  }

  function runGenerate(root) {
    var cfg = readConfig(root);
    var res = generate(cfg);
    var out = $("#smk-out", root);
    out.innerHTML = "";

    if (res.error) {
      out.appendChild(el('<div class="smk-alert smk-alert-err">' + res.error + "</div>"));
      return;
    }
    system = res;
    renderResults(out, res);
  }

  function renderResults(out, res) {
    var cfg = res.cfg;

    // status banner
    if (res.delivered < res.requested) {
      out.appendChild(el('<div class="smk-alert smk-alert-warn">Requested ' + res.requested +
        ' change keys; this space yields ' + res.delivered +
        ' interchange-free keys. Widen the depth range, add a chamber, or relax MACS for more.</div>'));
    } else {
      out.appendChild(el('<div class="smk-alert smk-alert-ok">Generated ' + res.delivered +
        ' interchange-free change keys. No assigned key operates another key’s cylinder.</div>'));
    }
    if (res.skippedInterchange > 0) {
      out.appendChild(el('<div class="smk-note" style="margin-bottom:12px">Rejected ' + res.skippedInterchange +
        ' candidate combinations during progression to prevent key interchange (phantom-key cross-opening).</div>'));
    }

    // stats
    var stats = el('<div class="smk-stat-row"></div>');
    [
      ["Change keys", res.delivered],
      ["Chambers", cfg.chambers],
      ["MACS", cfg.macs],
      ["Usable depths", res.pool.join(" ")],
      ["Theoretical max", res.theoreticalMax.toLocaleString()]
    ].forEach(function (s) {
      stats.appendChild(el('<div class="smk-stat"><div class="v">' + s[1] + '</div><div class="l">' + s[0] + '</div></div>'));
    });
    out.appendChild(stats);

    // pinning chart table
    var chamberHead = "";
    for (var c = 1; c <= cfg.chambers; c++) chamberHead += "<th>" + c + "</th>";

    var html = '<div class="smk-section"><h2>Master Pinning Chart</h2><div class="smk-scroll"><table class="smk-table">' +
      '<thead><tr><th>Key</th><th>Bitting</th>' + chamberHead + '<th>Opens</th></tr></thead><tbody>';

    // TMK row
    html += pinChartRow("TMK", res.tmk, pinning(operatingSets(res.gmk ? [res.tmk] : [res.tmk], cfg.chambers)), "tmk", "all");
    if (res.gmk) {
      html += pinChartRow("GMK", res.gmk, pinning(operatingSets([res.gmk], cfg.chambers)), "gmk", "all");
    }
    res.rows.forEach(function (r) {
      var opens = "1 door" + (r.incidental > 0 ? " (+" + r.incidental + " phantom)" : "");
      html += pinChartRow(r.id, r.key, r.pins, "", opens);
    });
    html += "</tbody></table></div>";
    html += '<div class="smk-note">Cells show the pin stack bottom-up: <b>B</b>=bottom pin, <b>M</b>=master (build-up) pin. ' +
            'A plain <b>B</b> with no <b>M</b> means that chamber is not master-pinned.</div></div>';
    out.appendChild(el(html));

    // download bar
    var bar = el('<div class="smk-section"><button class="smk-btn smk-btn-pdf" id="smk-pdf" type="button">↓ Download PDF cut-sheet set</button></div>');
    out.appendChild(bar);
    $("#smk-pdf", out).addEventListener("click", function () { exportPDF(res); });
  }

  function pinChartRow(id, bitting, pins, cls, opens) {
    var cells = pins.map(function (p) {
      var inner = '<span class="smk-pin-b">B' + p.bottom + '</span>';
      p.masters.forEach(function (m) { inner += ' <span class="smk-pin-m">M' + m + '</span>'; });
      return "<td>" + inner + "</td>";
    }).join("");
    return '<tr class="' + cls + '"><td class="k">' + id + '</td><td class="bit">' + bitting.join("") + "</td>" + cells + "<td>" + opens + "</td></tr>";
  }

  // =========================================================================
  // PDF export — a multi-page "set of sheets"
  // =========================================================================
  function exportPDF(res) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF library (jsPDF) is not loaded. Make sure the page has internet access to the CDN scripts.");
      return;
    }
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "pt", format: "letter" });
    var cfg = res.cfg;
    var pageW = doc.internal.pageSize.getWidth();
    var margin = 48;
    var today = new Date();
    var dateStr = today.getFullYear() + "-" + pad(today.getMonth() + 1, 2) + "-" + pad(today.getDate(), 2);

    function header(title) {
      doc.setFillColor(15, 22, 32); doc.rect(0, 0, pageW, 70, "F");
      doc.setFillColor(255, 176, 0); doc.rect(margin, 24, 22, 22, "F");
      doc.setTextColor(26, 18, 7); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("S", margin + 6, 40);
      doc.setTextColor(255, 255, 255); doc.setFontSize(14);
      doc.text(title, margin + 36, 36);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(159, 176, 195);
      doc.text((cfg.name || "Master Key System") + "   ·   " + dateStr, margin + 36, 52);
      doc.setTextColor(0, 0, 0);
    }
    function footer() {
      var n = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(140, 140, 140);
      doc.text("Schlage Master Key System Designer  ·  page " + n, margin, doc.internal.pageSize.getHeight() - 24);
    }

    // ---- Sheet 1: System summary ----
    header("System Summary");
    var info = [
      ["System / job", cfg.name || "—"],
      ["Customer", cfg.customer || "—"],
      ["Technician", cfg.tech || "—"],
      ["Date", dateStr],
      ["Pin chambers", String(cfg.chambers)],
      ["Cut range", cfg.minDepth + " – " + cfg.maxDepth + "  (.015\" increments)"],
      ["MACS", String(cfg.macs)],
      ["Progression", "Two-step (" + cfg.parity + ")  ·  usable depths " + res.pool.join(" ")],
      ["Top Master Key", res.tmk.join("")],
      ["Grand Master Key", res.gmk ? res.gmk.join("") : "— (none)"],
      ["Change keys delivered", res.delivered + " of " + res.requested + " requested"],
      ["Theoretical capacity", res.theoreticalMax.toLocaleString() + " combinations"],
      ["Interchange-free", "Yes — verified; " + res.skippedInterchange + " unsafe candidates skipped"]
    ];
    doc.autoTable({
      startY: 92,
      head: [["Parameter", "Value"]],
      body: info,
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [31, 44, 61], textColor: 255 },
      columnStyles: { 0: { cellWidth: 170, textColor: [90, 90, 90] }, 1: { fontStyle: "bold" } },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    footer();

    // ---- Sheet 2: Key schedule ----
    doc.addPage(); header("Key Schedule");
    var schedBody = [["TMK", res.tmk.join(""), "Top Master Key", "Operates all cylinders"]];
    if (res.gmk) schedBody.push(["GMK", res.gmk.join(""), "Grand Master Key", "Operates all cylinders"]);
    res.rows.forEach(function (r) {
      schedBody.push([r.id, r.key.join(""), "Change key", "Door / cylinder " + r.id]);
    });
    doc.autoTable({
      startY: 92,
      head: [["Stamp", "Bitting", "Type", "Assignment"]],
      body: schedBody,
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [31, 44, 61], textColor: 255 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 1: { font: "courier", cellWidth: 90 } },
      didParseCell: function (d) {
        if (d.section === "body" && (d.row.raw[2] !== "Change key")) {
          d.cell.styles.fillColor = d.row.raw[0] === "TMK" ? [255, 244, 220] : [223, 233, 252];
        }
      }
    });
    footer();

    // ---- Sheet 3: Master pinning chart (matrix) ----
    doc.addPage(); header("Master Pinning Chart");
    var headRow = ["Key", "Bitting"];
    for (var c = 1; c <= cfg.chambers; c++) headRow.push("Ch " + c);
    var pinBody = [];
    pinBody.push(["TMK", res.tmk.join("")].concat(pinning(operatingSets([res.tmk], cfg.chambers)).map(pinText)));
    if (res.gmk) pinBody.push(["GMK", res.gmk.join("")].concat(pinning(operatingSets([res.gmk], cfg.chambers)).map(pinText)));
    res.rows.forEach(function (r) { pinBody.push([r.id, r.key.join("")].concat(r.pins.map(pinText))); });
    doc.autoTable({
      startY: 92,
      head: [headRow],
      body: pinBody,
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, halign: "center" },
      headStyles: { fillColor: [31, 44, 61], textColor: 255 },
      columnStyles: { 0: { fontStyle: "bold" }, 1: { font: "courier" } },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    doc.setFontSize(8.5); doc.setTextColor(90, 90, 90);
    doc.text("B = bottom pin, M = master (build-up) pin, listed bottom-up. Pin numbers are .015\" increments.",
             margin, doc.lastAutoTable.finalY + 18);
    footer();

    // ---- Sheets 4+: per-door pinning tickets ----
    doc.addPage(); header("Door Pinning Tickets");
    var colW = (pageW - margin * 2 - 16) / 2;
    var x = margin, y = 92, ticketH = 118, gap = 16;
    res.rows.forEach(function (r, i) {
      if (y + ticketH > doc.internal.pageSize.getHeight() - 50) {
        if (x === margin) { x = margin + colW + 16; y = 92; }
        else { doc.addPage(); header("Door Pinning Tickets"); x = margin; y = 92; }
      }
      drawTicket(doc, x, y, colW, r, res, cfg);
      y += ticketH + gap;
      if (y + ticketH > doc.internal.pageSize.getHeight() - 50 && x === margin) {
        x = margin + colW + 16; y = 92;
      }
    });
    footer();

    var fname = "master-key-" + (cfg.name ? cfg.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "system") + "-" + dateStr + ".pdf";
    doc.save(fname);
  }

  function drawTicket(doc, x, y, w, r, res, cfg) {
    doc.setDrawColor(200); doc.setLineWidth(0.8);
    doc.roundedRect(x, y, w, 110, 5, 5, "S");
    doc.setFillColor(31, 44, 61); doc.roundedRect(x, y, w, 22, 5, 5, "F"); doc.rect(x, y + 14, w, 8, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Cylinder " + r.id, x + 8, y + 15);
    doc.setFont("courier", "bold"); doc.setFontSize(11);
    doc.text(r.key.join(""), x + w - 8, y + 15, { align: "right" });

    doc.setTextColor(60); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Operated by: TMK " + res.tmk.join("") + (res.gmk ? "  +GMK " + res.gmk.join("") : "") + "  +CK " + r.key.join(""),
             x + 8, y + 36);

    // chamber columns
    var n = cfg.chambers;
    var cw = (w - 16) / n;
    var topY = y + 46;
    for (var c = 0; c < n; c++) {
      var cx = x + 8 + c * cw;
      doc.setDrawColor(220); doc.line(cx, topY, cx, y + 104);
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(120);
      doc.text(String(c + 1), cx + cw / 2, topY + 8, { align: "center" });
      var p = r.pins[c];
      var lines = ["B" + p.bottom].concat(p.masters.map(function (m) { return "M" + m; }));
      doc.setFont("courier", "bold"); doc.setFontSize(8.5); doc.setTextColor(20);
      lines.forEach(function (ln, li) {
        var isMaster = ln[0] === "M";
        doc.setTextColor(isMaster ? 200 : 20, isMaster ? 120 : 20, isMaster ? 0 : 20);
        doc.text(ln, cx + cw / 2, topY + 22 + li * 11, { align: "center" });
      });
    }
    doc.setDrawColor(220); doc.line(x + 8 + n * cw, topY, x + 8 + n * cw, y + 104);
  }

  // =========================================================================
  // Boot
  // =========================================================================
  // Expose internals for testing / programmatic use (harmless in the browser).
  if (typeof window !== "undefined") {
    window.SMK = {
      generate: generate, pinning: pinning, operatingSets: operatingSets,
      operates: operates, depthPool: depthPool, macsOK: macsOK
    };
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { generate: generate, pinning: pinning, operatingSets: operatingSets, operates: operates };
  }

  function boot() {
    if (typeof document === "undefined") return;
    var root = document.getElementById("smk-app");
    if (root) mount(root);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
