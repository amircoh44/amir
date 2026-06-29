/* =============================================================================
 * Master Key System Designer  —  Schlage · Yale · Kwikset
 * -----------------------------------------------------------------------------
 * A self-mounting, dependency-light master-keying calculator for locksmiths.
 *
 * Two system types:
 *   • Simple        — Top Master Key + change keys, optional Grand Master Key.
 *   • Organization  — a 3-level admin hierarchy:
 *                       CEO (great grand master, opens everything)
 *                        └ Managers (master keys, each opens its block of rooms)
 *                           └ Employees (one change key per room).
 *
 * Brand presets (editable) set chamber count, cut range, MACS and keyways.
 * Generation uses Total Position Progression with two-step progression, MACS
 * validation, and a greedy interchange guard so no delivered key ever
 * cross-opens a cylinder it is not meant to.
 *
 * Requires (loaded by the host page): jsPDF (window.jspdf.jsPDF) + jspdf-autotable.
 * Mounts into the element with id "smk-app".
 *
 * Pin convention: depth numbers, higher = deeper cut; bottom pin # = cut depth;
 * master (build-up) pin # = difference between adjacent operating cut depths.
 * ===========================================================================*/
(function () {
  "use strict";

  // ---- Brand presets -------------------------------------------------------
  // Values are sensible defaults and remain editable in the UI. Chamber count
  // and cut range are the spec-defining differences; MACS/increment are shown
  // for reference and can be overridden per job.
  var BRANDS = {
    schlage: {
      label: "Schlage (Classic)", chambers: 6, min: 0, max: 9, macs: 7, increment: 0.015, minChambers: 6, maxChambers: 7,
      keyways: ["C", "CE", "E", "EF", "F", "FG", "L", "S123 (restricted)", "Everest C123 (restricted)", "Primus (hi-sec, 7-pin)"]
    },
    kwikset: {
      label: "Kwikset", chambers: 5, min: 1, max: 7, macs: 7, increment: 0.023, minChambers: 5, maxChambers: 5,
      keyways: ["KW1", "KW10", "KW11", "KW1 SmartKey"]
    },
    yale: {
      label: "Yale", chambers: 6, min: 0, max: 9, macs: 7, increment: 0.019, minChambers: 6, maxChambers: 7,
      keyways: ["Y1", "Y2", "Y11", "GA", "PARA 8", "EN (Euro)", "Keymark (restricted)"]
    }
  };

  var DEFAULTS = { brand: "schlage", parity: "even", changeKeys: 12, managers: 3, rooms: 18 };

  // Locksmith shop branding — printed on every PDF page and shown in the app.
  // `logo` may be an image URL (loaded at runtime) or a data: URL (uploaded).
  var SHOP = { name: "Defense Locksmith", web: "defenselocksmith.com", phone: "(716) 803-2934", logo: "" };
  var uploadedLogo = null; // data URL set when the user uploads a logo file

  // Developer credit — shown in the app footer and on every PDF page.
  var DEV = { name: "Amir Cohen", web: "amircohenstudio.com" };

  // ---- Ready-made templates ------------------------------------------------
  // Each prefills a whole job. `levels` renames the three tiers so the sheets
  // read in the customer's own language (e.g. Building Master / Floor / Apartment).
  var TEMPLATES = [
    { id: "custom", label: "— Start from scratch —" },
    {
      id: "apartment", label: "Apartment building (landlord)", systemType: "org", brand: "schlage", parity: "even",
      managers: 4, rooms: 24, name: "Apartment Building", levels: { top: "Building Master", mid: "Floor Master", unit: "Apartment" },
      blurb: "The building master opens every apartment (for the landlord / super). Each floor has a floor-master key, and every apartment has its own tenant key that opens only that unit."
    },
    {
      id: "office", label: "Business / office", systemType: "org", brand: "schlage", parity: "even",
      managers: 3, rooms: 18, name: "Office", levels: { top: "CEO Grand Master", mid: "Department Manager", unit: "Office" },
      blurb: "The CEO grand-master opens every office. Each department manager opens only their department's offices. Each employee key opens just their own office."
    },
    {
      id: "restaurant", label: "Restaurant", systemType: "org", brand: "kwikset", parity: "odd",
      managers: 4, rooms: 12, name: "Restaurant", levels: { top: "Owner Master", mid: "Shift Manager", unit: "Area" },
      blurb: "The owner master opens all areas (kitchen, bar, storeroom, office, walk-in). Shift managers open their assigned areas; line staff open only their own station."
    },
    {
      id: "hotel", label: "Hotel / motel", systemType: "org", brand: "schlage", parity: "even",
      managers: 5, rooms: 50, name: "Hotel", levels: { top: "Property Master", mid: "Floor / Housekeeping", unit: "Guest Room" },
      blurb: "A property master opens every guest room (front desk / manager). Housekeeping and floor keys open a block of rooms; each guest key opens a single room."
    },
    {
      id: "retail", label: "Retail store", systemType: "org", brand: "schlage", parity: "even",
      managers: 3, rooms: 9, name: "Retail Store", levels: { top: "Owner", mid: "Store Manager", unit: "Stockroom / Dept" },
      blurb: "The owner key opens the whole store. Store managers open their section; each stockroom or department door has its own key."
    },
    {
      id: "school", label: "School", systemType: "org", brand: "schlage", parity: "even",
      managers: 6, rooms: 36, name: "School", levels: { top: "Principal Grand Master", mid: "Department Head", unit: "Classroom" },
      blurb: "The principal's grand-master opens every classroom. Department heads open their wing; each teacher's key opens only their own classroom."
    },
    {
      id: "medical", label: "Medical / dental office", systemType: "org", brand: "schlage", parity: "even",
      managers: 3, rooms: 12, name: "Medical Office", levels: { top: "Practice Master", mid: "Provider", unit: "Exam Room" },
      blurb: "The practice master opens all rooms. Each provider opens their suite; exam-room keys open one room each."
    },
    {
      id: "storage", label: "Self-storage facility", systemType: "org", brand: "kwikset", parity: "odd",
      managers: 4, rooms: 40, name: "Storage Facility", levels: { top: "Facility Master", mid: "Aisle Master", unit: "Unit" },
      blurb: "The facility master opens every unit (for management). Each aisle has an aisle-master; each tenant key opens only their own storage unit."
    },
    {
      id: "small-office", label: "Small office — one master (simple)", systemType: "simple", brand: "schlage", parity: "even",
      changeKeys: 8, name: "Small Office",
      blurb: "One master key opens every door; each room has its own change key. No middle level — best for a handful of doors."
    },
    {
      id: "duplex", label: "Duplex / small rental (simple)", systemType: "simple", brand: "kwikset", parity: "odd",
      changeKeys: 4, name: "Rental Units",
      blurb: "A landlord master opens all units; each tenant key opens only their own unit."
    }
  ];
  function templateById(id) { for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i]; return TEMPLATES[0]; }
  var DEFAULT_LEVELS = { top: "CEO", mid: "Manager", unit: "Room" };

  // Maps a wizard "use" to level labels, a typical group size, and a unit noun.
  var USE_PROFILES = {
    apartments: { levels: { top: "Building Master", mid: "Floor Master", unit: "Apartment" }, per: 8, noun: "tenants / apartments" },
    business:   { levels: { top: "CEO Grand Master", mid: "Department Manager", unit: "Office" }, per: 6, noun: "employees / offices" },
    hotel:      { levels: { top: "Property Master", mid: "Floor / Housekeeping", unit: "Guest Room" }, per: 12, noun: "guest rooms" },
    restaurant: { levels: { top: "Owner Master", mid: "Shift Manager", unit: "Area" }, per: 4, noun: "areas / stations" },
    school:     { levels: { top: "Principal Grand Master", mid: "Department Head", unit: "Classroom" }, per: 6, noun: "classrooms" },
    storage:    { levels: { top: "Facility Master", mid: "Aisle Master", unit: "Unit" }, per: 10, noun: "storage units" },
    other:      { levels: { top: "CEO", mid: "Manager", unit: "Room" }, per: 8, noun: "rooms / units" }
  };

  function effLenFor(brandKey) {
    var b = BRANDS[brandKey];
    var ev = depthPool(b.min, b.max, "even").length, od = depthPool(b.min, b.max, "odd").length;
    return { parity: od > ev ? "odd" : "even", e: Math.max(ev, od) - 1 };
  }

  // The recommendation engine: given scale + desired security, suggest a brand,
  // pin count, keyway, parity and system structure — with a plain-language why.
  function recommendSystem(inp) {
    var u = USE_PROFILES[inp.use] || USE_PROFILES.other;
    var units = clamp(inp.units || 1, 1, 1000);
    var groups = (inp.groups && inp.groups > 0) ? clamp(inp.groups, 1, 100) : Math.max(1, Math.round(units / u.per));
    if (groups > units) groups = units;
    var security = inp.security || "Standard";
    var secMin = security === "Maximum" ? 7 : security === "High" ? 6 : 5;
    var perDept = Math.ceil(units / groups);

    function brandMax(bk) { return BRANDS[bk].maxChambers || BRANDS[bk].chambers; }
    function brandMin(bk) { return BRANDS[bk].minChambers || BRANDS[bk].chambers; }
    var MARGIN = 1.35; // headroom for MACS attrition during generation

    // Choose a brand if the user didn't pin one.
    var brand = inp.brandPref && inp.brandPref !== "recommend" ? inp.brandPref
      : (security !== "Standard" ? "schlage" : (units <= 40 && groups <= 4 ? "kwikset" : "schlage"));
    if (brandMax(brand) < secMin) brand = "schlage";

    function fitChambers(bk) {
      var pick = effLenFor(bk), e = pick.e, lo = Math.min(Math.max(secMin, brandMin(bk)), brandMax(bk));
      for (var n = lo; n <= brandMax(bk); n++) {
        var kM = positionsNeeded(e, Math.ceil(groups * MARGIN), n - 1);
        if (Math.pow(e, kM) >= groups * MARGIN && Math.pow(e, n - kM) >= perDept * MARGIN) return { chambers: n, parity: pick.parity, tight: false };
      }
      return { chambers: brandMax(bk), parity: pick.parity, tight: true };
    }

    var fit = fitChambers(brand);
    if (fit.tight && inp.brandPref === "recommend" && brand !== "schlage") { brand = "schlage"; fit = fitChambers(brand); }
    var b = BRANDS[brand];

    var keyways = {
      schlage: { Standard: "C", High: "Everest C123 (restricted)", Maximum: "Primus (hi-sec, 7-pin)" },
      kwikset: { Standard: "KW1", High: "KW1 SmartKey", Maximum: "KW1 SmartKey" },
      yale:    { Standard: "Y1", High: "Keymark (restricted)", Maximum: "Keymark (restricted)" }
    };
    var keyway = keyways[brand][security];
    var systemType = groups <= 1 ? "simple" : "org";

    var rationale = [];
    rationale.push("Scale: " + units + " " + u.noun + " across " + groups + " group" + (groups > 1 ? "s" : "") + " (~" + perDept + " per group).");
    rationale.push("Pins: " + fit.chambers + "-pin — " + (fit.chambers === secMin && secMin > 5 ? "the minimum for " + security.toLowerCase() + " security" : "enough chambers for interchange-free capacity at this scale") + ".");
    rationale.push("Keyway: " + keyway + " — " + (security === "Standard"
      ? "a common open keyway; blanks are cheap and copyable at most hardware stores."
      : security === "High"
        ? "a restricted keyway so blanks are controlled and not freely duplicated (key control)."
        : "a patented high-security keyway with pick/drill resistance and strict key control."));
    rationale.push("Brand: " + b.label + (inp.brandPref === "recommend" ? " (recommended for this size & security)" : " (your choice)") + ".");
    rationale.push("Structure: " + (systemType === "org" ? "3 levels — " + u.levels.top + " → " + u.levels.mid + " → " + u.levels.unit + "." : "2 levels — one master over " + units + " change keys (no middle level needed at this size)."));
    if (fit.tight) rationale.push("Heads-up: this is near the capacity ceiling for " + fit.chambers + " pins; the generator delivers as many interchange-free keys as fit and flags any shortfall — widen cuts or split into more groups for more.");

    return {
      brand: brand, chambers: fit.chambers, keyway: keyway, parity: fit.parity,
      minDepth: b.min, maxDepth: b.max, security: security, groups: groups, units: units,
      levels: u.levels, systemType: systemType, rationale: rationale, tight: fit.tight
    };
  }

  // ---- State ---------------------------------------------------------------
  var system = null;
  var appRoot = null; // set on mount; used by exportPDF to read branding fields

  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "DL";
    return (parts[0][0] + (parts[1] ? parts[1][0] : (parts[0][1] || ""))).toUpperCase();
  }

  function readBranding(root) {
    if (!root) return { name: SHOP.name, web: SHOP.web, phone: SHOP.phone, logo: SHOP.logo };
    return {
      name: ($("#smk-shop-name", root).value || "").trim() || SHOP.name,
      web: ($("#smk-shop-web", root).value || "").trim(),
      phone: ($("#smk-shop-phone", root).value || "").trim(),
      logo: uploadedLogo || ($("#smk-shop-logo", root).value || "").trim()
    };
  }

  // Resolve a logo (URL or data URL) to {data, w, h} via a canvas, or null.
  function loadLogo(src) {
    return new Promise(function (resolve) {
      if (!src || typeof Image === "undefined") { resolve(null); return; }
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        try {
          var c = document.createElement("canvas");
          c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
          c.getContext("2d").drawImage(img, 0, 0);
          resolve({ data: c.toDataURL("image/png"), w: c.width, h: c.height });
        } catch (e) { resolve(null); } // cross-origin tainted canvas, etc.
      };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // Reflect the current branding into the on-screen header logo + footer line.
  function syncBranding(root) {
    var logo = uploadedLogo || ($("#smk-shop-logo", root).value || "").trim();
    var name = ($("#smk-shop-name", root).value || "").trim() || SHOP.name;
    var box = $("#smk-brandlogo", root);
    if (logo) { box.innerHTML = '<img src="' + logo.replace(/"/g, "&quot;") + '" alt="logo">'; box.classList.add("smk-logo-img"); }
    else { box.textContent = initials(name); box.classList.remove("smk-logo-img"); }
    var foot = $("#smk-foot-brand", root);
    if (foot) foot.innerHTML = "<b>" + name + "</b> &middot; " + (($("#smk-shop-web", root).value || "").trim()) + " &middot; " + (($("#smk-shop-phone", root).value || "").trim());
  }

  // ---- DOM / misc helpers --------------------------------------------------
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function intArr(s) { return String(s).replace(/[^0-9]/g, "").split("").filter(function (c) { return c !== ""; }).map(Number); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = "0" + s; return s; }
  function keyStr(b) { return b.join("-"); }

  // ---- Keying primitives (unit-tested) -------------------------------------
  function depthPool(min, max, parity) {
    var pool = [];
    for (var d = min; d <= max; d++) {
      if (parity === "even" && d % 2 === 0) pool.push(d);
      else if (parity === "odd" && d % 2 === 1) pool.push(d);
    }
    return pool;
  }
  function macsOK(bitting, macs) {
    for (var i = 1; i < bitting.length; i++) if (Math.abs(bitting[i] - bitting[i - 1]) > macs) return false;
    return true;
  }
  function snapToPool(bitting, pool) {
    return bitting.map(function (d) {
      var best = pool[0], bestDist = Infinity;
      pool.forEach(function (p) { var dist = Math.abs(p - d); if (dist < bestDist) { bestDist = dist; best = p; } });
      return best;
    });
  }
  function randomBitting(chambers, pool, macs) {
    for (var attempt = 0; attempt < 800; attempt++) {
      var b = [];
      for (var c = 0; c < chambers; c++) {
        if (c === 0) b.push(pool[Math.floor(Math.random() * pool.length)]);
        else {
          var prev = b[c - 1];
          var ok = pool.filter(function (p) { return Math.abs(p - prev) <= macs; });
          b.push(ok[Math.floor(Math.random() * ok.length)]);
        }
      }
      if (macsOK(b, macs)) return b;
    }
    var fb = []; for (var i = 0; i < chambers; i++) fb.push(pool[0]); return fb;
  }
  // Per-chamber sorted unique operating depths for a cylinder operated by `keys`.
  function operatingSets(keys, chambers) {
    var sets = [];
    for (var c = 0; c < chambers; c++) {
      var seen = {};
      keys.forEach(function (k) { seen[k[c]] = true; });
      sets.push(Object.keys(seen).map(Number).sort(function (a, b) { return a - b; }));
    }
    return sets;
  }
  // Pin stack per chamber: bottom pin + master (build-up) pins.
  function pinning(sets) {
    return sets.map(function (depths) {
      var bottom = depths[0], masters = [];
      for (var i = 1; i < depths.length; i++) masters.push(depths[i] - depths[i - 1]);
      return { bottom: bottom, masters: masters, depths: depths };
    });
  }
  // Does bitting b operate a cylinder with these per-chamber operating sets?
  function operates(b, sets) {
    for (var c = 0; c < b.length; c++) if (sets[c].indexOf(b[c]) === -1) return false;
    return true;
  }
  function phantomCount(sets) { return sets.reduce(function (a, s) { return a * s.length; }, 1); }
  function sameBitting(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function pinText(p) {
    var parts = ["B" + p.bottom];
    p.masters.forEach(function (m) { parts.push("M" + m); });
    return parts.join(" · ");
  }

  // Forward-only progression iterator over pool^chambers in odometer order
  // (rightmost chamber fastest). Yields distinct, MACS-valid bittings that pass
  // an arbitrary predicate — the basis of the interchange-safe builder.
  function makeProgression(pool, chambers, macs, used) {
    var radix = pool.length, total = Math.pow(radix, chambers), ptr = 0;
    return {
      total: total,
      next: function (predicate) {
        while (ptr < total) {
          var idx = ptr++, rem = idx, bit = new Array(chambers);
          for (var c = chambers - 1; c >= 0; c--) { bit[c] = pool[rem % radix]; rem = Math.floor(rem / radix); }
          if (!macsOK(bit, macs)) continue;
          if (used[keyStr(bit)]) continue;
          if (predicate && !predicate(bit)) continue;
          return bit;
        }
        return null;
      }
    };
  }

  // -------------------------------------------------------------------------
  // SIMPLE system: TMK + change keys (+ optional GMK)
  // -------------------------------------------------------------------------
  function generateSimple(cfg) {
    var pool = depthPool(cfg.minDepth, cfg.maxDepth, cfg.parity);
    if (pool.length < 2) return { error: "The depth range and parity leave fewer than 2 usable cut depths. Widen the range or switch parity." };

    var tmk = snapToPool(cfg.tmk.slice(0, cfg.chambers), pool);
    while (tmk.length < cfg.chambers) tmk.push(pool[0]);
    if (!macsOK(tmk, cfg.macs)) return { error: "Top Master Key " + tmk.join("") + " violates MACS (" + cfg.macs + "). Adjust adjacent cuts or auto-generate." };

    var gmk = null;
    if (cfg.gmkEnabled) {
      if (!cfg.gmk.length) return { error: "Grand Master Key is enabled but no GMK bitting was entered. Type one or press “Auto-generate GMK”." };
      gmk = snapToPool(cfg.gmk.slice(0, cfg.chambers), pool);
      while (gmk.length < cfg.chambers) gmk.push(pool[0]);
      if (!macsOK(gmk, cfg.macs)) return { error: "Grand Master Key " + gmk.join("") + " violates MACS (" + cfg.macs + ")." };
    }

    var topKeys = gmk ? [tmk, gmk] : [tmk];
    var used = {}; used[keyStr(tmk)] = true; if (gmk) used[keyStr(gmk)] = true;

    var prog = makeProgression(pool, cfg.chambers, cfg.macs, used);
    var want = clamp(cfg.changeKeys, 1, 4000);
    var changeKeys = [], cylinders = [], skipped = 0;

    while (changeKeys.length < want) {
      var bit = prog.next(function (b) {
        if (sameBitting(b, tmk)) return false;
        if (gmk && sameBitting(b, gmk)) return false;
        var candSets = operatingSets(topKeys.concat([b]), cfg.chambers);
        for (var j = 0; j < cylinders.length; j++) {
          if (operates(b, cylinders[j].sets)) { skipped++; return false; }
          if (operates(cylinders[j].key, candSets)) { skipped++; return false; }
        }
        return true;
      });
      if (!bit) break;
      var sets = operatingSets(topKeys.concat([bit]), cfg.chambers);
      used[keyStr(bit)] = true;
      changeKeys.push(bit); cylinders.push({ key: bit, sets: sets });
    }

    var rows = cylinders.map(function (cyl, i) {
      var pins = pinning(cyl.sets), ph = phantomCount(cyl.sets);
      return { id: changeId(i), key: cyl.key, pins: pins, phantoms: ph, incidental: ph - (gmk ? 3 : 2), operatedBy: "TMK" + (gmk ? " + GMK" : "") + " + CK" };
    });

    return {
      systemType: "simple", cfg: cfg, pool: pool, tmk: tmk, gmk: gmk,
      changeKeys: changeKeys, rows: rows, theoreticalMax: prog.total,
      requested: want, delivered: changeKeys.length, skippedInterchange: skipped
    };
  }

  // -------------------------------------------------------------------------
  // ORGANIZATION system: CEO -> Managers -> Employees (rooms)
  // -------------------------------------------------------------------------
  function distribute(rooms, groups) {
    var base = Math.floor(rooms / groups), rem = rooms % groups, out = [];
    for (var i = 0; i < groups; i++) out.push(base + (i < rem ? 1 : 0));
    return out;
  }

  // Smallest number of positions whose base^k space can hold `count` variants.
  function positionsNeeded(base, count, maxPositions) {
    var k = 1;
    while (Math.pow(base, k) < count && k < maxPositions) k++;
    return k;
  }

  // Enumerate variants of `base` by replacing the cuts at `positions[i]` with
  // every odometer combination drawn from perPosPools[i] (rightmost fastest).
  // Calls cb(variant); stops early when cb returns false.
  function enumerateMulti(base, positions, perPosPools, cb) {
    var total = 1, i;
    for (i = 0; i < perPosPools.length; i++) total *= perPosPools[i].length;
    for (var idx = 0; idx < total; idx++) {
      var variant = base.slice(), rem = idx;
      for (var p = positions.length - 1; p >= 0; p--) {
        var pl = perPosPools[p];
        variant[positions[p]] = pl[rem % pl.length];
        rem = Math.floor(rem / pl.length);
      }
      if (cb(variant) === false) return;
    }
  }

  // ORGANIZATION via designated-position progression (the standard clean method):
  //   - "Master positions" carry the CEO↔Manager split (managers differ here).
  //   - "Change positions" carry the Manager↔Employee split (employees differ here).
  // This guarantees, by construction, that no foreign manager or employee can
  // open another department's room, while every manager opens its own rooms and
  // the CEO opens all of them.
  function generateOrg(cfg) {
    var pool = depthPool(cfg.minDepth, cfg.maxDepth, cfg.parity);
    if (pool.length < 2) return { error: "The depth range and parity leave fewer than 2 usable cut depths. Widen the range or switch parity." };

    var roomsTotal = clamp(cfg.rooms, 1, 1000);
    var mgrCount = clamp(cfg.managers, 1, 100);
    if (mgrCount > roomsTotal) mgrCount = roomsTotal; // no empty departments

    var ceo = snapToPool(cfg.ceo.slice(0, cfg.chambers), pool);
    while (ceo.length < cfg.chambers) ceo.push(pool[0]);
    if (!macsOK(ceo, cfg.macs)) return { error: "CEO key " + ceo.join("") + " violates MACS (" + cfg.macs + "). Adjust adjacent cuts or auto-generate." };

    var sizes = distribute(roomsTotal, mgrCount);
    var maxRoomsPerDept = Math.max.apply(null, sizes);

    // Effective per-position capacity: at each split position the cut is drawn
    // from the pool EXCLUDING the CEO's (base) cut there. Excluding the base
    // guarantees every distinct manager/employee gets a master pin in that
    // chamber and is non-interchangeable with its peers by construction.
    var effLen = pool.length - 1; // every chamber loses exactly the base cut
    // Split chambers: leftmost kM = master positions, rest = change positions.
    var kM = positionsNeeded(effLen, mgrCount, cfg.chambers - 1);
    var jC = cfg.chambers - kM;
    if (Math.pow(effLen, jC) < maxRoomsPerDept) {
      var need = positionsNeeded(effLen, maxRoomsPerDept, cfg.chambers - 1);
      if (need < cfg.chambers) { jC = Math.max(jC, need); kM = cfg.chambers - jC; if (kM < 1) { kM = 1; jC = cfg.chambers - 1; } }
    }
    var mPositions = [], cPositions = [], c;
    for (c = 0; c < kM; c++) mPositions.push(c);
    for (c = kM; c < cfg.chambers; c++) cPositions.push(c);

    // Per-position pools with the base cut removed.
    function poolWithout(idx) { return pool.filter(function (d) { return d !== ceo[idx]; }); }
    var mPools = mPositions.map(poolWithout);
    var cPools = cPositions.map(poolWithout);

    var used = {}; used[keyStr(ceo)] = true;

    // 1) Managers: vary master positions over the base-excluded pools.
    var managers = [], mgrKeys = [];
    enumerateMulti(ceo, mPositions, mPools, function (variant) {
      if (managers.length >= mgrCount) return false;
      if (!macsOK(variant, cfg.macs)) return true;
      if (used[keyStr(variant)]) return true;
      used[keyStr(variant)] = true;
      managers.push({ id: "MGR-" + (managers.length + 1), key: variant, rooms: [] });
      mgrKeys.push(variant);
      return true;
    });
    if (!managers.length) return { error: "Could not place any manager keys — the master-position keyspace is too small. Widen the depth range, add a chamber, or reduce managers." };

    // 2) Employees: for each manager, vary change positions over base-excluded
    //    pools. Cross-department and intra-department interchange are both
    //    prevented by construction; the guard below is a verified safety net.
    var cylinders = [], roomNo = 0, skipped = 0;
    for (var bi = 0; bi < managers.length; bi++) {
      var mgr = managers[bi], target = sizes[bi], placed = 0;
      enumerateMulti(mgr.key, cPositions, cPools, function (variant) {
        if (placed >= target) return false;
        if (!macsOK(variant, cfg.macs)) return true;
        if (used[keyStr(variant)]) return true;
        var candSets = operatingSets([ceo, mgr.key, variant], cfg.chambers);
        for (var x = 0; x < cylinders.length; x++) {
          if (operates(variant, cylinders[x].sets)) { skipped++; return true; }
          if (operates(cylinders[x].key, candSets)) { skipped++; return true; }
        }
        for (var mk = 0; mk < mgrKeys.length; mk++) {
          if (mk !== bi && operates(mgrKeys[mk], candSets)) { skipped++; return true; }
        }
        used[keyStr(variant)] = true;
        var pins = pinning(candSets), ph = phantomCount(candSets);
        roomNo++; placed++;
        var room = { id: "R" + roomNo, key: variant, pins: pins, phantoms: ph, incidental: ph - 3, mgrId: mgr.id, mgrIdx: bi, operatedBy: "CEO + " + mgr.id + " + employee" };
        mgr.rooms.push(room);
        cylinders.push({ sets: candSets, key: variant, mgrIdx: bi });
        return true;
      });
    }

    var flatRooms = [];
    managers.forEach(function (m) { m.rooms.forEach(function (rm) { flatRooms.push(rm); }); });

    return {
      systemType: "org", cfg: cfg, pool: pool, ceo: ceo, managers: managers,
      flatRooms: flatRooms, theoreticalMax: Math.pow(pool.length, cfg.chambers),
      masterPositions: mPositions.map(function (i) { return i + 1; }), changePositions: cPositions.map(function (i) { return i + 1; }),
      requestedRooms: roomsTotal, deliveredRooms: roomNo, requestedManagers: mgrCount,
      deliveredManagers: managers.length, skippedInterchange: skipped
    };
  }

  function changeId(i) {
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return (Math.floor(i / 26) + 1) + letters[i % 26];
  }

  function generate(cfg) { return cfg.systemType === "org" ? generateOrg(cfg) : generateSimple(cfg); }

  // =========================================================================
  // UI
  // =========================================================================
  function brandKeywayOptions(brandKey) {
    return BRANDS[brandKey].keyways.map(function (k) { return '<option value="' + k + '">' + k + "</option>"; }).join("");
  }
  function brandSelectOptions() {
    return Object.keys(BRANDS).map(function (k) { return '<option value="' + k + '">' + BRANDS[k].label + "</option>"; }).join("");
  }

  function mount(root) {
    appRoot = root;
    root.innerHTML = "";
    root.appendChild(el(
      '<div class="smk-header">' +
        '<div class="smk-logo" id="smk-brandlogo">DL</div>' +
        '<div><h1>Master Key System Designer</h1>' +
        '<div class="smk-sub" id="smk-subtitle">Schlage · Yale · Kwikset &middot; pinning, progression &amp; PDF cut-sheets</div></div>' +
      '</div>'
    ));

    var grid = el('<div class="smk-grid"></div>'); root.appendChild(grid);
    var form = el("<div></div>");

    // Quick Setup Wizard
    form.appendChild(el(
      '<div class="smk-panel smk-wizard">' +
        '<h2>① Quick Setup Wizard</h2>' +
        '<div class="smk-note">Answer a few questions — we’ll recommend the keyway, pin count, brand and structure, then fill everything in.</div>' +
        '<div class="smk-field"><label>What is this for?</label><select id="smk-w-use">' +
          '<option value="apartments">Apartment building — tenants</option>' +
          '<option value="business">Business / office — employees</option>' +
          '<option value="hotel">Hotel / motel</option>' +
          '<option value="restaurant">Restaurant</option>' +
          '<option value="school">School</option>' +
          '<option value="storage">Self-storage facility</option>' +
          '<option value="other">Other</option>' +
        '</select></div>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Groups (floors / depts / shifts)</label><input type="number" id="smk-w-groups" min="1" max="100" placeholder="auto"></div>' +
          '<div class="smk-field"><label id="smk-w-unitlabel">How many tenants?</label><input type="number" id="smk-w-units" min="1" max="1000" value="24"></div>' +
        '</div>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Security level</label><select id="smk-w-sec"><option>Standard</option><option>High</option><option>Maximum</option></select></div>' +
          '<div class="smk-field"><label>Brand</label><select id="smk-w-brand"><option value="recommend">Recommend for me</option><option value="schlage">Schlage</option><option value="kwikset">Kwikset</option><option value="yale">Yale</option></select></div>' +
        '</div>' +
        '<button class="smk-btn smk-btn-primary" id="smk-w-go" type="button">Recommend &amp; set up</button>' +
        '<div class="smk-rec" id="smk-w-out" style="display:none"></div>' +
      '</div>'
    ));

    // Template
    form.appendChild(el(
      '<div class="smk-panel">' +
        '<h2>② Or start from a template</h2>' +
        '<div class="smk-field"><label>Start from a ready-made setup</label><select id="smk-template">' +
          TEMPLATES.map(function (t) { return '<option value="' + t.id + '">' + t.label + "</option>"; }).join("") +
        '</select></div>' +
        '<div class="smk-note" id="smk-template-blurb">Pick a template to prefill the whole job, or start from scratch and configure it yourself.</div>' +
      '</div>'
    ));

    // Brand / keyway
    form.appendChild(el(
      '<div class="smk-panel">' +
        '<h2>Lock &amp; Keyway</h2>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Brand</label><select id="smk-brand">' + brandSelectOptions() + '</select></div>' +
          '<div class="smk-field"><label>Keyway</label><select id="smk-keyway">' + brandKeywayOptions(DEFAULTS.brand) + '</select></div>' +
        '</div>' +
        '<div class="smk-note" id="smk-brand-note"></div>' +
      '</div>'
    ));

    // System details
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

    // Cylinder spec (brand-filled, editable)
    form.appendChild(el(
      '<div class="smk-panel">' +
        '<h2>Cylinder Spec</h2>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Pin chambers</label><input type="number" id="smk-chambers" min="4" max="7"></div>' +
          '<div class="smk-field"><label>MACS</label><input type="number" id="smk-macs" min="1" max="9"></div>' +
        '</div>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Shallowest cut</label><input type="number" id="smk-min" min="0" max="9"></div>' +
          '<div class="smk-field"><label>Deepest cut</label><input type="number" id="smk-max" min="0" max="9"></div>' +
          '<div class="smk-field"><label>Progression</label><select id="smk-parity"><option value="even">Two-step (even)</option><option value="odd">Two-step (odd)</option></select></div>' +
        '</div>' +
        '<div class="smk-note">Two-step progression keeps every master pin even and at least 2 increments for reliable wafers.</div>' +
      '</div>'
    ));

    // Keying — system type switch
    form.appendChild(el(
      '<div class="smk-panel">' +
        '<h2>Keying</h2>' +
        '<div class="smk-field"><label>System type</label><select id="smk-systype">' +
          '<option value="org">Organization &mdash; CEO / Managers / Employees</option>' +
          '<option value="simple">Simple &mdash; Master + change keys</option>' +
        '</select></div>' +

        // --- Organization fields ---
        '<div id="smk-org">' +
          '<div class="smk-row">' +
            '<div class="smk-field"><label>Top level name</label><input type="text" id="smk-l-top" value="' + DEFAULT_LEVELS.top + '"></div>' +
            '<div class="smk-field"><label>Middle level name</label><input type="text" id="smk-l-mid" value="' + DEFAULT_LEVELS.mid + '"></div>' +
            '<div class="smk-field"><label>Unit name</label><input type="text" id="smk-l-unit" value="' + DEFAULT_LEVELS.unit + '"></div>' +
          '</div>' +
          '<div class="smk-field"><label><span id="smk-lab-top">CEO</span> key bitting (opens everything) — enter your own code or auto-generate</label>' +
            '<input type="text" id="smk-ceo" class="smk-bitting" maxlength="7">' +
            '<div class="smk-btnbar"><button class="smk-btn smk-btn-ghost" id="smk-gen-ceo" type="button">Auto-generate top key</button></div></div>' +
          '<div class="smk-row">' +
            '<div class="smk-field"><label><span id="smk-lab-mid">Manager</span>s (groups)</label><input type="number" id="smk-managers" min="1" max="100" value="' + DEFAULTS.managers + '"></div>' +
            '<div class="smk-field"><label>How many <span id="smk-lab-unit">room</span>s?</label><input type="number" id="smk-rooms" min="1" max="1000" value="' + DEFAULTS.rooms + '"></div>' +
          '</div>' +
          '<div class="smk-note">One key per unit. Each middle-level key opens only its own group; the top key opens everything.</div>' +
        '</div>' +

        // --- Simple fields ---
        '<div id="smk-simple" style="display:none">' +
          '<div class="smk-field"><label>Top Master Key (TMK) bitting</label>' +
            '<input type="text" id="smk-tmk" class="smk-bitting" maxlength="7">' +
            '<div class="smk-btnbar"><button class="smk-btn smk-btn-ghost" id="smk-gen-tmk" type="button">Auto-generate TMK</button></div></div>' +
          '<div class="smk-field smk-check"><input type="checkbox" id="smk-gmk-on"><label style="margin:0">Add a Grand Master Key (3-level)</label></div>' +
          '<div class="smk-field" id="smk-gmk-wrap" style="display:none"><label>Grand Master Key bitting</label>' +
            '<input type="text" id="smk-gmk" class="smk-bitting" maxlength="7">' +
            '<div class="smk-btnbar"><button class="smk-btn smk-btn-ghost" id="smk-gen-gmk" type="button">Auto-generate GMK</button></div></div>' +
          '<div class="smk-field"><label>Change keys needed</label><input type="number" id="smk-ck" min="1" max="2000" value="' + DEFAULTS.changeKeys + '"></div>' +
        '</div>' +

        '<button class="smk-btn smk-btn-primary" id="smk-generate" type="button">Generate System</button>' +
      '</div>'
    ));

    // Shop branding — appears on the app header and every PDF page.
    form.appendChild(el(
      '<div class="smk-panel">' +
        '<h2>Shop Branding</h2>' +
        '<div class="smk-field"><label>Shop name</label><input type="text" id="smk-shop-name" value="' + SHOP.name + '"></div>' +
        '<div class="smk-row">' +
          '<div class="smk-field"><label>Website</label><input type="text" id="smk-shop-web" value="' + SHOP.web + '"></div>' +
          '<div class="smk-field"><label>Phone</label><input type="text" id="smk-shop-phone" value="' + SHOP.phone + '"></div>' +
        '</div>' +
        '<div class="smk-field"><label>Logo image URL (from your website)</label><input type="text" id="smk-shop-logo" placeholder="https://defenselocksmith.com/.../logo.png"></div>' +
        '<div class="smk-field"><label>…or upload a logo file</label><input type="file" id="smk-shop-logo-file" accept="image/*"></div>' +
        '<div class="smk-note">The logo is embedded into the PDF and shown in the header. On your live site, paste the logo URL from your media library; uploads stay in your browser.</div>' +
      '</div>'
    ));

    grid.appendChild(form);

    var out = el('<div class="smk-panel" id="smk-out"></div>');
    out.appendChild(el('<div class="smk-empty">Pick a brand and system type on the left, then press <b>Generate System</b>.</div>'));
    grid.appendChild(out);

    root.appendChild(el(
      '<div class="smk-foot"><span id="smk-foot-brand"><b>' + SHOP.name + '</b> &middot; ' + SHOP.web + ' &middot; ' + SHOP.phone + '</span>' +
      '<br>For authorized locksmithing use. Brand specs are editable presets &mdash; always bench-verify the first cylinder before pinning a full system.' +
      '<br><span class="smk-dev">Developed by ' + DEV.name + ' &middot; <a href="https://' + DEV.web + '" target="_blank" rel="noopener">' + DEV.web + '</a></span></div>'
    ));

    applyBrand(root, DEFAULTS.brand);
    wire(root);
  }

  function applyBrand(root, brandKey) {
    var b = BRANDS[brandKey];
    $("#smk-chambers", root).value = b.chambers;
    $("#smk-macs", root).value = b.macs;
    $("#smk-min", root).value = b.min;
    $("#smk-max", root).value = b.max;
    $("#smk-keyway", root).innerHTML = brandKeywayOptions(brandKey);
    $("#smk-brand-note", root).innerHTML = b.label + ": " + b.chambers + " chambers, cuts " + b.min + "–" + b.max +
      ", MACS " + b.macs + ", " + b.increment.toFixed(3) + '" increments. Values are editable.';
    $("#smk-subtitle", root).textContent = b.label + " · pinning, progression & PDF cut-sheets";
    // refresh auto bittings to the new chamber count
    var pool = depthPool(b.min, b.max, $("#smk-parity", root).value);
    if (pool.length) {
      $("#smk-tmk", root).value = randomBitting(b.chambers, pool, b.macs).join("");
      $("#smk-ceo", root).value = randomBitting(b.chambers, pool, b.macs).join("");
    }
  }

  function applyTemplate(root, id) {
    var t = templateById(id);
    $("#smk-template-blurb", root).innerHTML = t.blurb || "Configure the system yourself below.";
    if (id === "custom") return;
    if (t.brand) { $("#smk-brand", root).value = t.brand; applyBrand(root, t.brand); }
    if (t.parity) $("#smk-parity", root).value = t.parity;
    if (t.name) $("#smk-name", root).value = t.name;
    $("#smk-systype", root).value = t.systemType;
    var org = t.systemType !== "simple";
    $("#smk-org", root).style.display = org ? "" : "none";
    $("#smk-simple", root).style.display = org ? "none" : "";
    if (org) {
      var L = t.levels || DEFAULT_LEVELS;
      $("#smk-l-top", root).value = L.top; $("#smk-l-mid", root).value = L.mid; $("#smk-l-unit", root).value = L.unit;
      $("#smk-managers", root).value = t.managers; $("#smk-rooms", root).value = t.rooms;
      syncLabels(root);
    } else if (t.changeKeys) {
      $("#smk-ck", root).value = t.changeKeys;
    }
    // refresh base key for the (possibly new) parity/brand
    var pool = depthPool(BRANDS[$("#smk-brand", root).value].min, BRANDS[$("#smk-brand", root).value].max, $("#smk-parity", root).value);
    if (pool.length) {
      var b = randomBitting(BRANDS[$("#smk-brand", root).value].chambers, pool, BRANDS[$("#smk-brand", root).value].macs).join("");
      $("#smk-ceo", root).value = b; $("#smk-tmk", root).value = b;
    }
  }

  function syncLabels(root) {
    $("#smk-lab-top", root).textContent = $("#smk-l-top", root).value || "Top";
    $("#smk-lab-mid", root).textContent = $("#smk-l-mid", root).value || "Group";
    $("#smk-lab-unit", root).textContent = ($("#smk-l-unit", root).value || "unit").toLowerCase();
  }

  function applyRecommendation(root, rec) {
    $("#smk-brand", root).value = rec.brand;
    applyBrand(root, rec.brand);                 // sets chambers/min/max/macs + keyway list + base keys
    $("#smk-chambers", root).value = rec.chambers;
    $("#smk-min", root).value = rec.minDepth;
    $("#smk-max", root).value = rec.maxDepth;
    $("#smk-parity", root).value = rec.parity;
    // ensure recommended keyway is selectable, then select it
    var kw = $("#smk-keyway", root);
    if (!Array.prototype.some.call(kw.options, function (o) { return o.value === rec.keyway; })) kw.appendChild(el('<option value="' + rec.keyway + '">' + rec.keyway + "</option>"));
    kw.value = rec.keyway;
    // system type
    $("#smk-systype", root).value = rec.systemType;
    var org = rec.systemType !== "simple";
    $("#smk-org", root).style.display = org ? "" : "none";
    $("#smk-simple", root).style.display = org ? "none" : "";
    if (org) {
      $("#smk-l-top", root).value = rec.levels.top; $("#smk-l-mid", root).value = rec.levels.mid; $("#smk-l-unit", root).value = rec.levels.unit;
      $("#smk-managers", root).value = rec.groups; $("#smk-rooms", root).value = rec.units;
      syncLabels(root);
    } else {
      $("#smk-ck", root).value = rec.units;
    }
    // regenerate a base key for the recommended chambers/parity
    var pool = depthPool(rec.minDepth, rec.maxDepth, rec.parity);
    if (pool.length) { var bk = randomBitting(rec.chambers, pool, BRANDS[rec.brand].macs).join(""); $("#smk-ceo", root).value = bk; $("#smk-tmk", root).value = bk; }
    // show rationale
    var box = $("#smk-w-out", root); box.style.display = "";
    box.innerHTML = '<div class="smk-rec-head">Recommendation: ' + BRANDS[rec.brand].label + " · " + rec.chambers + "-pin · keyway " + rec.keyway + " · " + rec.security + " security</div>" +
      rec.rationale.map(function (t) { return "<p>• " + t + "</p>"; }).join("") +
      '<p class="smk-rec-foot">Everything below has been filled in — review, tweak if needed, then press <b>Generate System</b>.</p>';
  }

  function wizardUnitLabel(use) {
    var map = { apartments: "How many tenants?", business: "How many employees?", hotel: "How many guest rooms?", restaurant: "How many areas/stations?", school: "How many classrooms?", storage: "How many units?", other: "How many units?" };
    return map[use] || "How many units?";
  }

  function wire(root) {
    $("#smk-w-use", root).addEventListener("change", function (e) { $("#smk-w-unitlabel", root).textContent = wizardUnitLabel(e.target.value); });
    $("#smk-w-go", root).addEventListener("click", function () {
      var rec = recommendSystem({
        use: $("#smk-w-use", root).value,
        groups: parseInt($("#smk-w-groups", root).value, 10) || null,
        units: parseInt($("#smk-w-units", root).value, 10) || 1,
        security: $("#smk-w-sec", root).value,
        brandPref: $("#smk-w-brand", root).value
      });
      applyRecommendation(root, rec);
    });
    $("#smk-template", root).addEventListener("change", function (e) { applyTemplate(root, e.target.value); });
    ["#smk-l-top", "#smk-l-mid", "#smk-l-unit"].forEach(function (s) {
      $(s, root).addEventListener("input", function () { syncLabels(root); });
    });
    $("#smk-brand", root).addEventListener("change", function (e) { applyBrand(root, e.target.value); });
    $("#smk-systype", root).addEventListener("change", function (e) {
      var org = e.target.value !== "simple";
      $("#smk-org", root).style.display = org ? "" : "none";
      $("#smk-simple", root).style.display = org ? "none" : "";
    });
    $("#smk-gmk-on", root).addEventListener("change", function (e) {
      $("#smk-gmk-wrap", root).style.display = e.target.checked ? "" : "none";
    });
    function gen(targetSel) {
      var cfg = readConfig(root);
      var pool = depthPool(cfg.minDepth, cfg.maxDepth, cfg.parity);
      if (pool.length) $(targetSel, root).value = randomBitting(cfg.chambers, pool, cfg.macs).join("");
    }
    $("#smk-gen-tmk", root).addEventListener("click", function () { gen("#smk-tmk"); });
    $("#smk-gen-ceo", root).addEventListener("click", function () { gen("#smk-ceo"); });
    $("#smk-gen-gmk", root).addEventListener("click", function () { gen("#smk-gmk"); });
    $("#smk-generate", root).addEventListener("click", function () { runGenerate(root); });

    // Shop branding live preview + logo upload
    ["#smk-shop-name", "#smk-shop-web", "#smk-shop-phone", "#smk-shop-logo"].forEach(function (s) {
      $(s, root).addEventListener("input", function () { if (s === "#smk-shop-logo") uploadedLogo = null; syncBranding(root); });
    });
    $("#smk-shop-logo-file", root).addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { uploadedLogo = rd.result; syncBranding(root); };
      rd.readAsDataURL(f);
    });
    syncBranding(root);
  }

  function readConfig(root) {
    var chambers = clamp(parseInt($("#smk-chambers", root).value, 10) || 6, 4, 7);
    var minD = clamp(parseInt($("#smk-min", root).value, 10), 0, 9);
    var maxD = clamp(parseInt($("#smk-max", root).value, 10), 0, 9);
    if (maxD < minD) { var t = maxD; maxD = minD; minD = t; }
    var brandKey = $("#smk-brand", root).value;
    return {
      brand: brandKey, brandLabel: BRANDS[brandKey].label, increment: BRANDS[brandKey].increment,
      keyway: $("#smk-keyway", root).value,
      systemType: $("#smk-systype", root).value === "simple" ? "simple" : "org",
      name: $("#smk-name", root).value.trim(),
      customer: $("#smk-customer", root).value.trim(),
      tech: $("#smk-tech", root).value.trim(),
      chambers: chambers, minDepth: minD, maxDepth: maxD,
      macs: clamp(parseInt($("#smk-macs", root).value, 10) || 7, 1, 9),
      parity: $("#smk-parity", root).value === "odd" ? "odd" : "even",
      // simple
      tmk: intArr($("#smk-tmk", root).value),
      gmkEnabled: $("#smk-gmk-on", root).checked,
      gmk: intArr($("#smk-gmk", root).value),
      changeKeys: clamp(parseInt($("#smk-ck", root).value, 10) || 12, 1, 2000),
      // org
      ceo: intArr($("#smk-ceo", root).value),
      managers: clamp(parseInt($("#smk-managers", root).value, 10) || 1, 1, 100),
      rooms: clamp(parseInt($("#smk-rooms", root).value, 10) || 1, 1, 1000),
      levels: {
        top: $("#smk-l-top", root).value.trim() || DEFAULT_LEVELS.top,
        mid: $("#smk-l-mid", root).value.trim() || DEFAULT_LEVELS.mid,
        unit: $("#smk-l-unit", root).value.trim() || DEFAULT_LEVELS.unit
      }
    };
  }

  function runGenerate(root) {
    var cfg = readConfig(root);
    var res = generate(cfg);
    var out = $("#smk-out", root); out.innerHTML = "";
    if (res.error) { out.appendChild(el('<div class="smk-alert smk-alert-err">' + res.error + "</div>")); return; }
    system = res;
    if (res.systemType === "org") renderOrg(out, res); else renderSimple(out, res);
  }

  // ---- shared bits ---------------------------------------------------------
  function statRow(items) {
    var s = el('<div class="smk-stat-row"></div>');
    items.forEach(function (it) { s.appendChild(el('<div class="smk-stat"><div class="v">' + it[1] + '</div><div class="l">' + it[0] + '</div></div>')); });
    return s;
  }
  function pinCells(pins) {
    return pins.map(function (p) {
      var inner = '<span class="smk-pin-b">B' + p.bottom + '</span>';
      p.masters.forEach(function (m) { inner += ' <span class="smk-pin-m">M' + m + '</span>'; });
      return "<td>" + inner + "</td>";
    }).join("");
  }
  function chamberHead(n) { var h = ""; for (var c = 1; c <= n; c++) h += "<th>" + c + "</th>"; return h; }

  function renderSimple(out, res) {
    var cfg = res.cfg;
    if (res.delivered < res.requested)
      out.appendChild(el('<div class="smk-alert smk-alert-warn">Requested ' + res.requested + ' change keys; this keyspace yields ' + res.delivered + ' interchange-free keys. Widen the depth range, add a chamber, or relax MACS for more.</div>'));
    else
      out.appendChild(el('<div class="smk-alert smk-alert-ok">Generated ' + res.delivered + ' interchange-free change keys. No assigned key operates another key’s cylinder.</div>'));

    out.appendChild(statRow([
      ["Change keys", res.delivered], ["Brand", cfg.brandLabel.split(" ")[0]], ["Keyway", cfg.keyway],
      ["Chambers", cfg.chambers], ["MACS", cfg.macs], ["Usable depths", res.pool.join(" ")]
    ]));

    out.appendChild(explainBox(res));

    var html = '<div class="smk-section"><h2>Master Pinning Chart</h2><div class="smk-scroll"><table class="smk-table">' +
      '<thead><tr><th>Key</th><th>Bitting</th>' + chamberHead(cfg.chambers) + '<th>Opens</th></tr></thead><tbody>';
    html += '<tr class="tmk"><td class="k">TMK</td><td class="bit">' + res.tmk.join("") + "</td>" + pinCells(pinning(operatingSets([res.tmk], cfg.chambers))) + "<td>all cylinders</td></tr>";
    if (res.gmk) html += '<tr class="gmk"><td class="k">GMK</td><td class="bit">' + res.gmk.join("") + "</td>" + pinCells(pinning(operatingSets([res.gmk], cfg.chambers))) + "<td>all cylinders</td></tr>";
    res.rows.forEach(function (r) {
      html += '<tr><td class="k">' + r.id + '</td><td class="bit">' + r.key.join("") + "</td>" + pinCells(r.pins) + "<td>1 door" + (r.incidental > 0 ? " (+" + r.incidental + " phantom)" : "") + "</td></tr>";
    });
    html += '</tbody></table></div><div class="smk-note"><b>B</b>=bottom pin, <b>M</b>=master pin, bottom-up.</div></div>';
    out.appendChild(el(html));

    addPdfButton(out, res);
  }

  function renderOrg(out, res) {
    var cfg = res.cfg, L = cfg.levels;
    if (res.deliveredRooms < res.requestedRooms)
      out.appendChild(el('<div class="smk-alert smk-alert-warn">Requested ' + res.requestedRooms + " " + plural(L.unit) + "; this keyspace yields " + res.deliveredRooms + " interchange-free " + plural(L.unit) + " across " + res.deliveredManagers + " " + plural(L.mid) + ". Widen the depth range, add a chamber, or reduce " + plural(L.mid) + " for more capacity.</div>"));
    else
      out.appendChild(el('<div class="smk-alert smk-alert-ok">Built a 3-level system: 1 ' + L.top + " key, " + res.deliveredManagers + " " + L.mid + " keys, and " + res.deliveredRooms + " " + L.unit + " keys — all interchange-free.</div>"));

    out.appendChild(statRow([
      [plural(L.unit), res.deliveredRooms], [plural(L.mid), res.deliveredManagers], ["Levels", 3],
      ["Brand", cfg.brandLabel.split(" ")[0]], ["Keyway", cfg.keyway], ["Usable depths", res.pool.join(" ")]
    ]));

    out.appendChild(explainBox(res));

    var html = '<div class="smk-section"><h2>Hierarchy &amp; Pinning Chart</h2><div class="smk-scroll"><table class="smk-table">' +
      '<thead><tr><th>Key</th><th>Level</th><th>Bitting</th>' + chamberHead(cfg.chambers) + '<th>Opens</th></tr></thead><tbody>';
    html += '<tr class="ceo"><td class="k">' + L.top + '</td><td>' + L.top + '</td><td class="bit">' + res.ceo.join("") + "</td>" + pinCells(pinning(operatingSets([res.ceo], cfg.chambers))) + "<td>all " + plural(L.unit) + "</td></tr>";
    res.managers.forEach(function (m) {
      var roomIds = m.rooms.map(function (r) { return r.id; }).join(", ");
      html += '<tr class="mgr"><td class="k">' + m.id + '</td><td>' + L.mid + '</td><td class="bit">' + m.key.join("") + "</td>" + pinCells(pinning(operatingSets([m.key], cfg.chambers))) + "<td>" + (roomIds || "—") + "</td></tr>";
      m.rooms.forEach(function (r) {
        html += '<tr><td class="k">' + r.id + '</td><td>' + L.unit + '</td><td class="bit">' + r.key.join("") + "</td>" + pinCells(r.pins) + "<td>" + L.unit + " " + r.id + (r.incidental > 0 ? " (+" + r.incidental + " phantom)" : "") + "</td></tr>";
      });
    });
    html += '</tbody></table></div><div class="smk-note">' + L.top + "/" + L.mid + " rows show that key’s nominal stack; each " + L.unit.toLowerCase() + " row shows the actual pinning when keyed to " + L.top + " + its " + L.mid + " + its " + L.unit + ". <b>B</b>=bottom pin, <b>M</b>=master pin.</div></div>";
    out.appendChild(el(html));

    addPdfButton(out, res);
  }

  function plural(w) { return /s$/i.test(w) ? w : w + "s"; }

  // Plain-language explanation lines for a generated system.
  function explainLines(res) {
    var cfg = res.cfg, lines = [];
    if (res.systemType === "org") {
      var L = cfg.levels, first = res.managers[0];
      lines.push("This is a 3-level master key system" + (cfg.name ? " for " + cfg.name : "") + " on " + cfg.brandLabel + " (keyway " + cfg.keyway + ").");
      lines.push("1 " + L.top + " key (" + res.ceo.join("") + ") opens all " + res.deliveredRooms + " " + plural(L.unit) + ".");
      lines.push(res.deliveredManagers + " " + L.mid + " keys: each opens only its own group of " + plural(L.unit) + (first && first.rooms.length ? " — e.g. " + first.id + " (" + first.key.join("") + ") opens " + first.rooms[0].id + (first.rooms.length > 1 ? "–" + first.rooms[first.rooms.length - 1].id : "") + "." : "."));
      lines.push(res.deliveredRooms + " " + L.unit + " keys: each opens just its own " + L.unit.toLowerCase() + " and nothing else.");
      var chN = function (a) { return (a.length > 1 ? "chambers " : "chamber ") + a.join(" & "); };
      lines.push("Why it's safe: " + L.top + " cuts are the baseline; " + plural(L.mid) + " differ in " + chN(res.masterPositions) + ", and " + plural(L.unit) + " differ in " + chN(res.changePositions) + ". Because those cuts never reuse the baseline value, no key can accidentally open a door it isn't meant to (verified: 0 interchange).");
    } else {
      lines.push("This is a " + (res.gmk ? "3" : "2") + "-level master key system" + (cfg.name ? " for " + cfg.name : "") + " on " + cfg.brandLabel + " (keyway " + cfg.keyway + ").");
      if (res.gmk) lines.push("Grand Master (" + res.gmk.join("") + ") and Top Master (" + res.tmk.join("") + ") both open every door.");
      else lines.push("1 Master key (" + res.tmk.join("") + ") opens all " + res.delivered + " doors.");
      lines.push(res.delivered + " change keys: each opens just its own door.");
      lines.push("Verified interchange-free — no change key opens another door.");
    }
    lines.push("Reading a pinning ticket: stack the pins bottom-up. B = bottom pin (sits on the key), M = master/build-up pin above it. A chamber showing only B is not master-pinned. Pin numbers are " + cfg.increment.toFixed(3) + "\" increments.");
    return lines;
  }

  function explainBox(res) {
    var box = el('<div class="smk-section smk-explain"><h2>How this system works</h2></div>');
    explainLines(res).forEach(function (t) { box.appendChild(el("<p>• " + t + "</p>")); });
    return box;
  }

  function addPdfButton(out, res) {
    var bar = el('<div class="smk-section"><button class="smk-btn smk-btn-pdf" id="smk-pdf" type="button">↓ Download PDF cut-sheet set</button></div>');
    out.appendChild(bar);
    $("#smk-pdf", out).addEventListener("click", function () { exportPDF(res); });
  }

  // =========================================================================
  // PDF export
  // =========================================================================
  function exportPDF(res) {
    if (!window.jspdf || !window.jspdf.jsPDF) { alert("PDF library (jsPDF) is not loaded. The page needs internet access to the CDN scripts."); return; }
    var brand = readBranding(appRoot);
    loadLogo(brand.logo).then(function (logo) { buildPDF(res, brand, logo); });
  }

  function buildPDF(res, brand, logo) {
    var jsPDF = window.jspdf.jsPDF, doc = new jsPDF({ unit: "pt", format: "letter" });
    var cfg = res.cfg, pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight(), margin = 48;
    var today = new Date();
    var dateStr = today.getFullYear() + "-" + pad(today.getMonth() + 1, 2) + "-" + pad(today.getDate(), 2);

    function header(title) {
      doc.setFillColor(10, 28, 18); doc.rect(0, 0, pageW, 70, "F"); // dark forest band
      var titleX;
      if (logo && logo.data) {
        var h = 36, w = h * (logo.w / logo.h); if (w > 130) { w = 130; h = w * (logo.h / logo.w); }
        try { doc.addImage(logo.data, "PNG", margin, (70 - h) / 2, w, h); } catch (e) {}
        titleX = margin + w + 14;
      } else {
        doc.setFillColor(255, 255, 255); doc.rect(margin, 22, 26, 26, "F"); // white tile
        doc.setTextColor(7, 18, 11); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(initials(brand.name), margin + 4, 39);
        titleX = margin + 40;
      }
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(title, titleX, 32);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(178, 192, 182); // silver
      doc.text((cfg.name || "Master Key System") + "  ·  " + cfg.brandLabel + "  ·  keyway " + cfg.keyway + "  ·  " + dateStr, titleX, 50);
      doc.setTextColor(0, 0, 0);
    }
    // Shop branding + developer credit on every page (left), page number (right).
    // Stamped in a final pass so even auto-paginated table pages carry it.
    function footerPage(pageNum, total) {
      doc.setDrawColor(210, 222, 213); doc.setLineWidth(0.5); doc.line(margin, pageH - 38, pageW - margin, pageH - 38);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(15, 42, 26);
      doc.text([brand.name, brand.web, brand.phone].filter(Boolean).join("  ·  "), margin, pageH - 26);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(140, 150, 142);
      doc.text("Developed by " + DEV.name + "  ·  " + DEV.web, margin, pageH - 16);
      doc.setFontSize(8); doc.text("page " + pageNum + " of " + total, pageW - margin, pageH - 21, { align: "right" });
    }
    // Draw the header band on every page a long table spans.
    function tableChrome(title) { return function () { header(title); }; }

    // ---- Summary ----
    header("System Summary");
    var info = [
      ["System / job", cfg.name || "—"], ["Customer", cfg.customer || "—"], ["Technician", cfg.tech || "—"], ["Date", dateStr],
      ["Brand", cfg.brandLabel], ["Keyway", cfg.keyway],
      ["Pin chambers", String(cfg.chambers)], ["Cut range", cfg.minDepth + " – " + cfg.maxDepth + "  (" + cfg.increment.toFixed(3) + "\" increments)"],
      ["MACS", String(cfg.macs)], ["Progression", "Two-step (" + cfg.parity + ")  ·  usable depths " + res.pool.join(" ")]
    ];
    var OL = cfg.levels || DEFAULT_LEVELS;
    if (res.systemType === "org") {
      info.push(["System type", "Organization — " + OL.top + " / " + OL.mid + " / " + OL.unit]);
      info.push([OL.top + " key", res.ceo.join("")]);
      info.push([plural(OL.mid), String(res.deliveredManagers)]);
      info.push([plural(OL.unit) + " delivered", res.deliveredRooms + " of " + res.requestedRooms + " requested"]);
    } else {
      info.push(["System type", "Simple — Master + change keys"]);
      info.push(["Top Master Key", res.tmk.join("")]);
      info.push(["Grand Master Key", res.gmk ? res.gmk.join("") : "— (none)"]);
      info.push(["Change keys delivered", res.delivered + " of " + res.requested + " requested"]);
    }
    info.push(["Theoretical capacity", res.theoreticalMax.toLocaleString() + " combinations"]);
    info.push(["Interchange-free", "Yes — verified; " + res.skippedInterchange + " unsafe candidates skipped"]);

    doc.autoTable({
      startY: 92, head: [["Parameter", "Value"]], body: info, theme: "grid",
      margin: { top: 80, bottom: 46, left: margin, right: margin }, tableWidth: pageW - margin * 2, didDrawPage: tableChrome("System Summary"),
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6, overflow: "linebreak", lineColor: [210, 222, 213], lineWidth: 0.4 }, headStyles: { fillColor: [15, 42, 26], textColor: 255 },
      columnStyles: { 0: { cellWidth: 180, textColor: [90, 90, 90] }, 1: { fontStyle: "bold" } },
      alternateRowStyles: { fillColor: [238, 244, 239] }
    });

    // ---- How this system works (plain language) ----
    doc.addPage(); header("How This System Works");
    var ey = 96;
    doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    explainLines(res).forEach(function (t) {
      var wrapped = doc.splitTextToSize("•  " + t, pageW - margin * 2);
      if (ey + wrapped.length * 15 > pageH - 60) { doc.addPage(); header("How This System Works"); ey = 96; }
      doc.text(wrapped, margin, ey); ey += wrapped.length * 15 + 8;
    });

    // ---- Key schedule ----
    doc.addPage(); header("Key Schedule");
    var schedBody = [], schedHead;
    if (res.systemType === "org") {
      schedHead = [["Stamp", "Level", "Bitting", "Opens"]];
      schedBody.push([OL.top, OL.top, res.ceo.join(""), "All " + plural(OL.unit)]);
      res.managers.forEach(function (m) {
        schedBody.push([m.id, OL.mid, m.key.join(""), m.rooms.map(function (r) { return r.id; }).join(", ") || "—"]);
        m.rooms.forEach(function (r) { schedBody.push([r.id, OL.unit, r.key.join(""), OL.unit + " " + r.id]); });
      });
    } else {
      schedHead = [["Stamp", "Type", "Bitting", "Assignment"]];
      schedBody.push(["TMK", "Top Master", res.tmk.join(""), "All cylinders"]);
      if (res.gmk) schedBody.push(["GMK", "Grand Master", res.gmk.join(""), "All cylinders"]);
      res.rows.forEach(function (r) { schedBody.push([r.id, "Change key", r.key.join(""), "Cylinder " + r.id]); });
    }
    doc.autoTable({
      startY: 92, head: schedHead, body: schedBody, theme: "grid",
      margin: { top: 80, bottom: 46, left: margin, right: margin }, tableWidth: pageW - margin * 2, didDrawPage: tableChrome("Key Schedule"),
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 5, overflow: "linebreak", lineColor: [210, 222, 213], lineWidth: 0.4 }, headStyles: { fillColor: [15, 42, 26], textColor: 255 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 }, 2: { font: "courier", cellWidth: 90 } },
      didParseCell: function (d) {
        if (d.section !== "body") return;
        var lvl = d.row.raw[1];
        if (lvl === OL.top || lvl === "Top Master") d.cell.styles.fillColor = [223, 238, 228];
        else if (lvl === OL.mid || lvl === "Grand Master") d.cell.styles.fillColor = [236, 240, 237];
      }
    });

    // ---- Master pinning chart ----
    doc.addPage(); header("Master Pinning Chart");
    var headRow = ["Key", "Bitting"]; for (var c = 1; c <= cfg.chambers; c++) headRow.push("Ch " + c);
    var pinBody = [];
    if (res.systemType === "org") {
      pinBody.push(["CEO", res.ceo.join("")].concat(pinning(operatingSets([res.ceo], cfg.chambers)).map(pinText)));
      res.managers.forEach(function (m) {
        pinBody.push([m.id, m.key.join("")].concat(pinning(operatingSets([m.key], cfg.chambers)).map(pinText)));
        m.rooms.forEach(function (r) { pinBody.push([r.id, r.key.join("")].concat(r.pins.map(pinText))); });
      });
    } else {
      pinBody.push(["TMK", res.tmk.join("")].concat(pinning(operatingSets([res.tmk], cfg.chambers)).map(pinText)));
      if (res.gmk) pinBody.push(["GMK", res.gmk.join("")].concat(pinning(operatingSets([res.gmk], cfg.chambers)).map(pinText)));
      res.rows.forEach(function (r) { pinBody.push([r.id, r.key.join("")].concat(r.pins.map(pinText))); });
    }
    doc.autoTable({
      startY: 92, head: [headRow], body: pinBody, theme: "grid",
      margin: { top: 80, bottom: 46, left: margin, right: margin }, tableWidth: pageW - margin * 2, didDrawPage: tableChrome("Master Pinning Chart"),
      styles: { font: "helvetica", fontSize: cfg.chambers >= 7 ? 7.5 : 8.5, cellPadding: 3, halign: "center", overflow: "linebreak", lineColor: [210, 222, 213], lineWidth: 0.4 },
      headStyles: { fillColor: [15, 42, 26], textColor: 255 },
      columnStyles: { 0: { fontStyle: "bold", halign: "left" }, 1: { font: "courier", halign: "left" } }, alternateRowStyles: { fillColor: [238, 244, 239] }
    });
    if (doc.lastAutoTable.finalY < pageH - 60) {
      doc.setFontSize(8.5); doc.setTextColor(90, 90, 90);
      doc.text("B = bottom pin, M = master (build-up) pin, listed bottom-up. Pin numbers are " + cfg.increment.toFixed(3) + "\" increments.", margin, doc.lastAutoTable.finalY + 18);
    }

    // ---- Door pinning tickets ----
    doc.addPage(); header("Door Pinning Tickets");
    var tickets = res.systemType === "org"
      ? res.flatRooms.map(function (r) { return { id: r.id, key: r.key, pins: r.pins, opby: r.operatedBy, top: res.ceo, mid: managerKeyById(res, r.mgrId), midId: r.mgrId }; })
      : res.rows.map(function (r) { return { id: r.id, key: r.key, pins: r.pins, opby: r.operatedBy, top: res.tmk, mid: res.gmk, midId: "GMK" }; });

    var colW = (pageW - margin * 2 - 16) / 2, x = margin, y = 92, ticketH = 116, gap = 14;
    tickets.forEach(function (t) {
      if (y + ticketH > pageH - 50) {
        if (x === margin) { x = margin + colW + 16; y = 92; }
        else { doc.addPage(); header("Door Pinning Tickets"); x = margin; y = 92; }
      }
      drawTicket(doc, x, y, colW, t, cfg);
      y += ticketH + gap;
    });

    // Final pass: stamp the shop footer on every page (covers auto-paginated pages).
    var total = doc.internal.getNumberOfPages();
    for (var pi = 1; pi <= total; pi++) { doc.setPage(pi); footerPage(pi, total); }

    var fname = "master-key-" + (cfg.name ? cfg.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "system") + "-" + dateStr + ".pdf";
    doc.save(fname);
  }

  function managerKeyById(res, id) {
    for (var i = 0; i < res.managers.length; i++) if (res.managers[i].id === id) return res.managers[i].key;
    return null;
  }

  function drawTicket(doc, x, y, w, t, cfg) {
    doc.setDrawColor(200); doc.setLineWidth(0.8); doc.roundedRect(x, y, w, 108, 5, 5, "S");
    doc.setFillColor(15, 42, 26); doc.roundedRect(x, y, w, 22, 5, 5, "F"); doc.rect(x, y + 14, w, 8, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Cylinder " + t.id, x + 8, y + 15);
    doc.setFont("courier", "bold"); doc.setFontSize(11); doc.text(t.key.join(""), x + w - 8, y + 15, { align: "right" });

    doc.setTextColor(60); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    var by = "Operated by: " + t.top.join("") + (t.mid ? "  +" + (t.midId || "") + " " + t.mid.join("") : "") + "  +CK " + t.key.join("");
    doc.text(by, x + 8, y + 35);

    var n = cfg.chambers, cw = (w - 16) / n, topY = y + 44;
    for (var c = 0; c < n; c++) {
      var cx = x + 8 + c * cw;
      doc.setDrawColor(220); doc.line(cx, topY, cx, y + 102);
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(120); doc.text(String(c + 1), cx + cw / 2, topY + 8, { align: "center" });
      var p = t.pins[c], lines = ["B" + p.bottom].concat(p.masters.map(function (m) { return "M" + m; }));
      doc.setFont("courier", "bold"); doc.setFontSize(8.5);
      lines.forEach(function (ln, li) {
        var isM = ln[0] === "M";
        doc.setTextColor(isM ? 110 : 15, isM ? 118 : 15, isM ? 112 : 15); // master = gray, bottom = near-black
        doc.text(ln, cx + cw / 2, topY + 22 + li * 10, { align: "center" });
      });
    }
    doc.setDrawColor(220); doc.line(x + 8 + n * cw, topY, x + 8 + n * cw, y + 102);
  }

  // =========================================================================
  // Boot / exports
  // =========================================================================
  if (typeof window !== "undefined") {
    window.SMK = { generate: generate, generateSimple: generateSimple, generateOrg: generateOrg, recommendSystem: recommendSystem, pinning: pinning, operatingSets: operatingSets, operates: operates, depthPool: depthPool, macsOK: macsOK, BRANDS: BRANDS };
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { generate: generate, generateSimple: generateSimple, generateOrg: generateOrg, recommendSystem: recommendSystem, pinning: pinning, operatingSets: operatingSets, operates: operates, depthPool: depthPool, macsOK: macsOK, BRANDS: BRANDS };
  }

  function boot() {
    if (typeof document === "undefined") return;
    var root = document.getElementById("smk-app");
    if (root) mount(root);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})();
