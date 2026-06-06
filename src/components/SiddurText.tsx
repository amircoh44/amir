import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import type { MissingEntry, NusachEntry, SiddurDoc, SiddurIndex, SiddurNode } from '../types/siddur';
import './SiddurText.css';

// Vite serves files in /public from the site root.
const BASE = `${import.meta.env.BASE_URL}siddur`;

type SearchScope = 'titles' | 'text';
type Panel = 'directory' | 'missing';

/** A leaf with no Hebrew text is "missing". */
function isMissing(node: SiddurNode): boolean {
  return !node.children?.length && !(node.lines && node.lines.length > 0);
}

/** Filter a tree by query. Titles scope keeps whole matching subtrees;
 *  text scope keeps leaves whose lines contain the query. */
function filterTree(node: SiddurNode, q: string, scope: SearchScope): SiddurNode | null {
  if (!q) return node;
  const titleHit =
    (node.heTitle ?? '').includes(q) || (node.enTitle ?? '').toLowerCase().includes(q.toLowerCase());
  if (scope === 'titles' && titleHit) return node;
  if (node.children?.length) {
    const kids = node.children.map((c) => filterTree(c, q, scope)).filter(Boolean) as SiddurNode[];
    return kids.length ? { ...node, children: kids } : null;
  }
  if (scope === 'titles') return titleHit ? node : null;
  const textHit = (node.lines ?? []).some((l) => l.includes(q));
  return textHit ? node : null;
}

/** Locate a node by its heTitle path (as recorded for missing entries). */
function findByPath(root: SiddurNode, path: string[]): SiddurNode | null {
  let cur: SiddurNode | undefined = root;
  for (const title of path) {
    cur = cur?.children?.find((c) => (c.heTitle || c.enTitle) === title);
    if (!cur) return null;
  }
  return cur ?? null;
}

/** Split a line on the query, wrapping matches in <mark>. */
function highlight(line: string, q: string) {
  if (!q) return line;
  const parts = line.split(q);
  if (parts.length === 1) return line;
  return parts.flatMap((p, i) =>
    i === 0 ? [p] : [<mark key={i}>{q}</mark>, p],
  );
}

function DirectoryNode({
  node,
  path,
  selectedPath,
  forceOpen,
  onSelect,
}: {
  node: SiddurNode;
  path: string;
  selectedPath: string;
  forceOpen: boolean;
  onSelect: (path: string, node: SiddurNode) => void;
}) {
  const [open, setOpen] = useState(path.split('/').length <= 1);
  const expanded = forceOpen || open;
  const hasChildren = !!node.children?.length;
  const label = node.heTitle || node.enTitle || '—';
  const missing = isMissing(node);

  return (
    <li className="dir-item">
      <div className={`dir-row ${selectedPath === path ? 'selected' : ''}`}>
        {hasChildren ? (
          <button
            className="dir-toggle"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={() => setOpen((o) => !o)}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="dir-toggle leaf">{missing ? '⚠' : '•'}</span>
        )}
        <button
          className={`dir-label ${missing ? 'missing' : ''}`}
          onClick={() => onSelect(path, node)}
        >
          {label}
        </button>
      </div>
      {hasChildren && expanded && (
        <ul className="dir-children">
          {node.children!.map((child, i) => (
            <DirectoryNode
              key={`${path}/${i}`}
              node={child}
              path={`${path}/${i}`}
              selectedPath={selectedPath}
              forceOpen={forceOpen}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function TextNode({ node, depth, query }: { node: SiddurNode; depth: number; query: string }) {
  const headingTag = `h${Math.min(depth + 2, 6)}`;
  const missing = isMissing(node);
  return (
    <section className="text-section">
      {node.heTitle &&
        createElement(headingTag, { className: 'text-heading' }, node.heTitle)}
      {missing && <p className="text-missing">⚠ אין טקסט במקור (text missing in source)</p>}
      {node.lines?.map((line, i) => (
        <p className="text-line" key={i}>
          {highlight(line, query)}
        </p>
      ))}
      {node.children?.map((child, i) => (
        <TextNode key={i} node={child} depth={depth + 1} query={query} />
      ))}
    </section>
  );
}

export function SiddurText() {
  const [index, setIndex] = useState<SiddurIndex | null>(null);
  const [active, setActive] = useState<NusachEntry | null>(null);
  const [doc, setDoc] = useState<SiddurDoc | null>(null);
  const [selectedPath, setSelectedPath] = useState('root');
  const [selectedNode, setSelectedNode] = useState<SiddurNode | null>(null);
  const [error, setError] = useState<{ scope: string; msg: string } | null>(null);

  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('titles');
  const [panel, setPanel] = useState<Panel>('directory');

  // Load the catalog of nuschaot once.
  useEffect(() => {
    let ignore = false;
    fetch(`${BASE}/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load catalog (HTTP ${r.status})`);
        return r.json() as Promise<SiddurIndex>;
      })
      .then((idx) => {
        if (ignore) return;
        setIndex(idx);
        setActive(idx.nuschaot[0] ?? null);
      })
      .catch((e) => !ignore && setError({ scope: 'index', msg: String(e.message ?? e) }));
    return () => {
      ignore = true;
    };
  }, []);

  // Load the selected nusach's text whenever it changes.
  useEffect(() => {
    if (!active) return;
    let ignore = false;
    fetch(`${BASE}/${active.file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load ${active.title} (HTTP ${r.status})`);
        return r.json() as Promise<SiddurDoc>;
      })
      .then((d) => {
        if (ignore) return;
        setDoc(d);
        const first = d.tree.children?.[0];
        setSelectedPath(first ? 'root/0' : 'root');
        setSelectedNode(first ?? d.tree);
      })
      .catch((e) => !ignore && setError({ scope: active.key, msg: String(e.message ?? e) }));
    return () => {
      ignore = true;
    };
  }, [active]);

  const loading = !!active && doc?.key !== active.key && error?.scope !== active.key;

  const handleSelect = useCallback((path: string, node: SiddurNode) => {
    setSelectedPath(path);
    setSelectedNode(node);
  }, []);

  const handleMissingSelect = useCallback(
    (entry: MissingEntry) => {
      if (!doc) return;
      const node = findByPath(doc.tree, entry.path) ?? { heTitle: entry.heTitle, lines: [] };
      setSelectedPath('');
      setSelectedNode(node);
      setPanel('directory');
    },
    [doc],
  );

  const handleDownload = useCallback(() => {
    if (!active) return;
    const a = document.createElement('a');
    a.href = `${BASE}/${active.text}`;
    a.download = `${active.key}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [active]);

  // Filtered tree for the directory (live search).
  const currentDoc = doc && active && doc.key === active.key ? doc : null;
  const filteredTree = useMemo(() => {
    if (!currentDoc) return null;
    return filterTree(currentDoc.tree, query.trim(), searchScope);
  }, [currentDoc, query, searchScope]);

  const activeError = error?.scope === active?.key ? error : null;

  if (error?.scope === 'index' && !index) {
    return <div className="siddur error">⚠ {error.msg}</div>;
  }
  if (!index) {
    return <div className="siddur loading">Loading Siddur Text…</div>;
  }

  return (
    <div className="siddur">
      <div className="siddur-toolbar">
        <div className="nusach-tabs" role="tablist">
          {index.nuschaot.map((n) => (
            <button
              key={n.key}
              role="tab"
              aria-selected={active?.key === n.key}
              className={`nusach-tab ${active?.key === n.key ? 'active' : ''}`}
              onClick={() => {
                setActive(n);
                setQuery('');
                setPanel('directory');
              }}
            >
              <span className="nusach-he">{n.nusachHe}</span>
              <span className="nusach-en">{n.title}</span>
            </button>
          ))}
        </div>
        <div className="siddur-meta">
          <span>{(currentDoc ? active?.lines ?? 0 : 0).toLocaleString()} שורות</span>
          <button className="download-btn" onClick={handleDownload} disabled={!active}>
            ⬇ הורד טקסט עברי
          </button>
        </div>
      </div>

      {/* Search / find widget */}
      <div className="siddur-search" dir="rtl">
        <span className="search-icon">🔎</span>
        <input
          className="search-input"
          type="search"
          placeholder="חיפוש בסידור…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="search-scope">
          חפש ב:
          <select value={searchScope} onChange={(e) => setSearchScope(e.target.value as SearchScope)}>
            <option value="titles">כותרות הקטעים</option>
            <option value="text">תוכן התפילה</option>
          </select>
        </label>
        <div className="panel-toggle">
          <button
            className={panel === 'directory' ? 'active' : ''}
            onClick={() => setPanel('directory')}
          >
            תוכן עניינים
          </button>
          <button
            className={`${panel === 'missing' ? 'active' : ''} ${active && active.missing > 0 ? 'has-missing' : ''}`}
            onClick={() => setPanel('missing')}
          >
            טקסט חסר{active ? ` (${active.missing})` : ''}
          </button>
        </div>
        {query && (
          <button className="search-clear" onClick={() => setQuery('')}>
            ✕ נקה
          </button>
        )}
      </div>

      <div className="siddur-body" dir="rtl">
        <aside className="siddur-directory">
          {loading && <div className="dir-loading">טוען…</div>}
          {activeError && !loading && <div className="dir-loading error">⚠ {activeError.msg}</div>}

          {currentDoc && panel === 'missing' && (
            <div className="missing-panel">
              <h4>סעיפים ללא טקסט במקור</h4>
              {currentDoc.missing.length === 0 ? (
                <p className="missing-empty">✓ אין טקסט חסר בנוסח זה</p>
              ) : (
                <ul className="missing-list">
                  {currentDoc.missing.map((m, i) => (
                    <li key={i}>
                      <button onClick={() => handleMissingSelect(m)}>
                        <span className="missing-title">⚠ {m.heTitle || m.enTitle}</span>
                        <span className="missing-trail">{m.path.join(' › ')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {currentDoc && panel === 'directory' && (
            <ul className="dir-root">
              <li className="dir-item">
                <div className={`dir-row ${selectedPath === 'root' ? 'selected' : ''}`}>
                  <span className="dir-toggle leaf">📖</span>
                  <button
                    className="dir-label root"
                    onClick={() => handleSelect('root', currentDoc.tree)}
                  >
                    {currentDoc.heTitle}
                  </button>
                </div>
              </li>
              {filteredTree?.children?.length ? (
                filteredTree.children.map((child, i) => (
                  <DirectoryNode
                    key={`root/${i}`}
                    node={child}
                    path={`root/${i}`}
                    selectedPath={selectedPath}
                    forceOpen={!!query.trim()}
                    onSelect={handleSelect}
                  />
                ))
              ) : query.trim() ? (
                <li className="dir-noresults">אין תוצאות עבור “{query}”</li>
              ) : null}
            </ul>
          )}
        </aside>

        <main className="siddur-content">
          {currentDoc && selectedNode ? (
            <article className="hebrew-text">
              <TextNode node={selectedNode} depth={0} query={searchScope === 'text' ? query.trim() : ''} />
              <footer className="text-source">
                מקור:{' '}
                <a href={currentDoc.source} target="_blank" rel="noreferrer">
                  {currentDoc.source}
                </a>
              </footer>
            </article>
          ) : (
            !loading && <div className="content-empty">בחר נוסח וקטע מהתפריט</div>
          )}
        </main>
      </div>
    </div>
  );
}
