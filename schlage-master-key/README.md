# Master Key System Designer — Schlage · Yale · Kwikset

A self-contained app for locksmiths that **designs a master key system** and
exports a **set of printable PDF cut / pinning sheets**. Built to drop into a
WordPress page — either as raw HTML in an **Elementor "HTML" widget**, or as a
plugin with a `[schlage_master_key]` shortcode.

It follows real lock specs (cut depths, `.015"`-class increments, bottom-pin =
cut depth, MACS) and uses **Total Position Progression** with **two-step
progression** so every master (build-up) pin is even and reliable. Every
generated system is checked to be **interchange-free** — no key opens a cylinder
it isn't meant to.

---

## What it does

- **Three brands** with editable presets: **Schlage** (6-pin), **Kwikset**
  (5-pin), **Yale** (6-pin) — plus a **keyway picker** per brand (including
  restricted / high-security keyways).
- **Two system types**
  - **Simple** — Top Master Key + change keys, optional Grand Master Key.
  - **Organization** — a 3-level admin hierarchy that **asks how many rooms**:
    **CEO** (opens everything) → **Managers** (each opens one department/group)
    → **Employees** (one key per room). Level names are fully relabelable
    (Building Master / Floor Master / Apartment, Owner / Shift Manager / Area, …).
- **Quick Setup Wizard** — answer a few questions (use, how many tenants /
  employees, groups, security level, brand) and it **recommends the keyway,
  pin count (5 / 6 / 7) and brand**, explains why, and fills the form.
- **Many ready-made templates** — apartment building (landlord), business /
  office, hotel, restaurant, school, medical office, self-storage, small office,
  duplex.
- **You enter the CEO / master "first code"** (or auto-generate) and the whole
  system progresses from it.
- **Explainable** — a plain-language "How this system works" panel on screen and
  as a PDF page.
- **Interchange / phantom-key detection** — rejects any key that would
  cross-open another cylinder, and reports incidental phantom keys per door.
- **Shop branding** — your shop name, website, phone and **logo** print on every
  PDF page (and the app header).
- **PDF export** (clean, letter-size): System Summary, *How This System Works*,
  Key Schedule, Master Pinning Chart, and per-door Pinning Tickets.

---

## Three ways to use it

### 1. Elementor "HTML" widget (no plugin)
Open [`schlage-master-key.html`](schlage-master-key.html), copy the **entire
file**, and paste it into an Elementor **HTML** widget (or a Gutenberg "Custom
HTML" block). It is fully self-contained; the only externals are the jsPDF +
jsPDF-AutoTable CDN scripts the page loads itself (needs `cdnjs.cloudflare.com`).

### 2. WordPress plugin (shortcode)
Zip this folder → **Plugins → Add New → Upload Plugin** → Activate → put
`[schlage_master_key]` in a page, a Gutenberg **Shortcode** block, or an
Elementor **Shortcode** widget.

### 3. Standalone
Open `schlage-master-key.html` in any modern browser.

---

## Shop branding & logo

Open the **Shop Branding** panel and set the shop name / website / phone
(pre-filled with **Defense Locksmith · defenselocksmith.com · (716) 803-2934**)
and add a logo by either:
- pasting the **logo image URL** from your site's media library, or
- **uploading** a logo file (stays in your browser).

The logo is embedded into every PDF page header. If no logo is set, a monogram
of the shop name is used.

> The phone number above was looked up from the public listing for Defense
> Locksmith (Buffalo, NY). Please confirm it's correct for your shop, or change
> it in the Shop Branding panel.

---

## Project layout

```
schlage-master-key/
├── schlage-master-key.php      WordPress plugin (shortcode: [schlage_master_key])
├── schlage-master-key.html     Self-contained build — paste into Elementor HTML widget
├── build.sh                    Regenerates the .html by inlining app/*.css + app/*.js
├── app/
│   ├── schlage-master-key.css  Canonical styles (scoped under #smk-app)
│   └── schlage-master-key.js   Canonical app: engine, wizard, templates, PDF
└── README.md
```

`app/` is the canonical source; regenerate the standalone HTML with:

```bash
bash schlage-master-key/build.sh
```

---

## The keying math (so you can trust the sheets)

For each chamber of a cylinder, collect the cut depths of **all** keys that must
operate it (CEO/master, the manager/GMK if any, and the change/employee key),
sorted ascending `d0 < d1 < … < dn`:

- **Bottom pin** = `d0` (shallowest cut).
- **Master pins** = the gaps between adjacent depths: `d1−d0, d2−d1, …`.
- The stack sums to the deepest cut, so a shear line forms for every operating
  key. Two-step progression keeps each gap even and `≥ 2`.

**Why the hierarchy is interchange-free:** the CEO/master cuts are the baseline;
managers differ only in reserved "master" chambers and employees differ only in
the remaining "change" chambers — and those positions never reuse the baseline
value. That makes every department mathematically isolated, so no manager or
employee key can open another group's door (the app verifies this and reports
0 interchange).

> **Always bench-verify the first cylinder before pinning a full system.** For
> authorized locksmithing work.

---

## Tech notes

- Plain ES5-compatible JavaScript, self-mounting into `#smk-app`. No framework.
- PDF generation is 100% client-side via
  [jsPDF](https://github.com/parallax/jsPDF) `2.5.1` +
  [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) `3.8.2`.
- The engine is unit-tested for pin-stack correctness, two-step master pins,
  MACS, zero key interchange (simple and 3-level), and the recommender is tested
  end-to-end into the generator.
- License: MIT.
