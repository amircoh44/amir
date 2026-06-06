#!/usr/bin/env node
// Downloads the *Hebrew* text of the Siddur for several nuschaot (rites) from
// Sefaria's public corpus and writes one directory per nusach.
//
// Source: Sefaria-Export public dataset on Google Cloud Storage.
//   https://storage.googleapis.com/sefaria-export/json/Liturgy/Siddur/<Title>/Hebrew/merged.json
// Sefaria's own API (www.sefaria.org/api) works too and is used by the in-app
// page at runtime, but is not reachable from every CI/build network — the GCS
// bucket is, so the build-time downloader sources from there.
//
// Usage:  node scripts/download-siddur.mjs
//
// Output (under public/siddur/):
//   index.json                     catalog of every nusach that was fetched
//   <key>/<key>.json               structured Hebrew text tree (for the app)
//   <key>/<key>.txt                flattened, plain Hebrew text (download)

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'siddur');
const GCS = 'https://storage.googleapis.com/sefaria-export/json/Liturgy/Siddur';

// The nuschaot requested. `gcs` is the exact title used in the Sefaria export.
// Note: Sefaria has no complete standalone Yemenite (Teiman) siddur; Edot
// HaMizrach is the closest Mizrahi / North-African rite available.
const NUSCHAOT = [
  { key: 'ashkenaz',       title: 'Siddur Ashkenaz',        he: 'נוסח אשכנז',        gcs: 'Siddur Ashkenaz' },
  { key: 'sefard',         title: 'Siddur Sefard',          he: 'נוסח ספרד',         gcs: 'Siddur Sefard' },
  { key: 'edot-hamizrach', title: 'Siddur Edot HaMizrach',  he: 'נוסח עדות המזרח',   gcs: 'Siddur Edot HaMizrach' },
  { key: 'chabad',         title: 'Weekday Siddur Chabad',  he: 'נוסח חב"ד (אר"י)',  gcs: 'Weekday Siddur Chabad' },
];

/** Strip Sefaria HTML markup, keep the Hebrew letters + nikkud (Unicode). */
function stripHtml(s) {
  return String(s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#?\w+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Recursively flatten an arbitrarily-nested array of strings into clean lines. */
function flattenLines(val) {
  const out = [];
  const visit = (v) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (typeof v === 'string') {
      const t = stripHtml(v);
      if (t) out.push(t);
    }
  };
  visit(val);
  return out;
}

/** Build a map of enTitle -> heTitle from the Sefaria schema tree. */
function buildHeMap(schema, map = {}) {
  if (!schema) return map;
  if (schema.enTitle && schema.heTitle) map[schema.enTitle] = schema.heTitle;
  for (const child of schema.nodes || []) buildHeMap(child, map);
  return map;
}

/**
 * Turn Sefaria's `text` value into our display tree.
 * dict  -> { children: [...] } ; array -> { lines: [...] }.
 */
function buildTree(textVal, heMap) {
  if (Array.isArray(textVal)) {
    const lines = flattenLines(textVal);
    return { lines };
  }
  if (textVal && typeof textVal === 'object') {
    const children = [];
    for (const [enTitle, v] of Object.entries(textVal)) {
      const node = buildTree(v, heMap);
      node.enTitle = enTitle;
      node.heTitle = heMap[enTitle] || enTitle;
      children.push(node);
    }
    return { children };
  }
  return { lines: [] };
}

/** Count the leaf lines in a tree (for the catalog). */
function countLines(node) {
  if (node.lines) return node.lines.length;
  return (node.children || []).reduce((n, c) => n + countLines(c), 0);
}

/** Flatten the tree into a plain-text Hebrew document. */
function toPlainText(node, title, depth = 0) {
  const out = [];
  const walk = (n, d) => {
    if (n.heTitle) out.push(`${'#'.repeat(Math.min(d, 6))} ${n.heTitle}`.trim());
    if (n.lines) for (const line of n.lines) out.push(line);
    for (const c of n.children || []) walk(c, d + 1);
    if (n.children) out.push('');
  };
  out.push(`# ${title}`, '');
  for (const c of node.children || []) walk(c, 1);
  if (node.lines) for (const line of node.lines) out.push(line);
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const catalog = [];

  for (const n of NUSCHAOT) {
    const url = `${GCS}/${encodeURIComponent(n.gcs)}/Hebrew/merged.json`;
    process.stdout.write(`• ${n.title} … `);
    let raw;
    try {
      raw = await fetchJson(url);
    } catch (err) {
      console.log(`SKIPPED (${err.message})`);
      continue;
    }

    const heMap = buildHeMap(raw.schema);
    const tree = buildTree(raw.text, heMap);
    const lineCount = countLines(tree);

    const doc = {
      key: n.key,
      title: n.title,
      heTitle: raw.heTitle || n.he,
      nusachHe: n.he,
      language: 'he',
      source: raw.versionSource || `https://www.sefaria.org/${n.gcs.replace(/ /g, '_')}`,
      versionTitle: raw.versionTitle || '',
      tree,
    };

    const dir = join(OUT_DIR, n.key);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${n.key}.json`), JSON.stringify(doc), 'utf8');
    await writeFile(join(dir, `${n.key}.txt`), toPlainText(tree, doc.heTitle), 'utf8');

    catalog.push({
      key: n.key,
      title: n.title,
      heTitle: doc.heTitle,
      nusachHe: n.he,
      source: doc.source,
      lines: lineCount,
      file: `${n.key}/${n.key}.json`,
      text: `${n.key}/${n.key}.txt`,
    });
    console.log(`OK (${lineCount} lines)`);
  }

  await writeFile(
    join(OUT_DIR, 'index.json'),
    JSON.stringify({ name: 'Siddur Text', generated: new Date().toISOString(), nuschaot: catalog }, null, 2),
    'utf8',
  );
  console.log(`\nWrote ${catalog.length} nuschaot to public/siddur/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
