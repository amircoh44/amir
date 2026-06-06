import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import type { NusachEntry, SiddurDoc, SiddurIndex, SiddurNode } from '../types/siddur';
import './SiddurText.css';

// Vite serves files in /public from the site root.
const BASE = `${import.meta.env.BASE_URL}siddur`;

/** A single entry in the section directory (left pane). */
function DirectoryNode({
  node,
  path,
  selectedPath,
  onSelect,
}: {
  node: SiddurNode;
  path: string;
  selectedPath: string;
  onSelect: (path: string, node: SiddurNode) => void;
}) {
  const [open, setOpen] = useState(path.split('/').length <= 1);
  const hasChildren = !!node.children?.length;
  const label = node.heTitle || node.enTitle || '—';
  const isSelected = selectedPath === path;

  return (
    <li className="dir-item">
      <div className={`dir-row ${isSelected ? 'selected' : ''}`}>
        {hasChildren ? (
          <button
            className="dir-toggle"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="dir-toggle leaf">•</span>
        )}
        <button className="dir-label" onClick={() => onSelect(path, node)}>
          {label}
        </button>
      </div>
      {hasChildren && open && (
        <ul className="dir-children">
          {node.children!.map((child, i) => (
            <DirectoryNode
              key={`${path}/${i}`}
              node={child}
              path={`${path}/${i}`}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Recursively render the Hebrew text of a node and its descendants. */
function TextNode({ node, depth }: { node: SiddurNode; depth: number }) {
  const headingTag = `h${Math.min(depth + 2, 6)}`;
  return (
    <section className="text-section">
      {node.heTitle &&
        createElement(headingTag, { className: 'text-heading' }, node.heTitle)}
      {node.lines?.map((line, i) => (
        <p className="text-line" key={i}>
          {line}
        </p>
      ))}
      {node.children?.map((child, i) => (
        <TextNode key={i} node={child} depth={depth + 1} />
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
  // `scope` ties an error to what failed: 'index' or a nusach key.
  const [error, setError] = useState<{ scope: string; msg: string } | null>(null);

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
        // Default to the first top-level section so we don't render everything.
        const first = d.tree.children?.[0];
        setSelectedPath(first ? 'root/0' : 'root');
        setSelectedNode(first ?? d.tree);
      })
      .catch((e) => !ignore && setError({ scope: active.key, msg: String(e.message ?? e) }));
    return () => {
      ignore = true;
    };
  }, [active]);

  // Derived loading: an active nusach is selected but its doc/error isn't here yet.
  const loading = !!active && doc?.key !== active.key && error?.scope !== active.key;

  const handleSelect = useCallback((path: string, node: SiddurNode) => {
    setSelectedPath(path);
    setSelectedNode(node);
  }, []);

  const handleDownload = useCallback(() => {
    if (!active) return;
    // Download the pre-generated, Hebrew-only plain-text file.
    const a = document.createElement('a');
    a.href = `${BASE}/${active.text}`;
    a.download = `${active.key}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [active]);

  const total = useMemo(
    () => index?.nuschaot.reduce((n, x) => n + x.lines, 0) ?? 0,
    [index],
  );

  if (error?.scope === 'index' && !index) {
    return <div className="siddur error">⚠ {error.msg}</div>;
  }
  if (!index) {
    return <div className="siddur loading">Loading Siddur Text…</div>;
  }

  // Only treat the loaded doc as current when it matches the active nusach.
  const currentDoc = doc && active && doc.key === active.key ? doc : null;
  const activeError = error?.scope === active?.key ? error : null;

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
              onClick={() => setActive(n)}
            >
              <span className="nusach-he">{n.nusachHe}</span>
              <span className="nusach-en">{n.title}</span>
            </button>
          ))}
        </div>
        <div className="siddur-meta">
          <span>{total.toLocaleString()} שורות עברית</span>
          <button className="download-btn" onClick={handleDownload} disabled={!active}>
            ⬇ הורד טקסט עברי
          </button>
        </div>
      </div>

      <div className="siddur-body" dir="rtl">
        <aside className="siddur-directory">
          {loading && <div className="dir-loading">טוען…</div>}
          {activeError && !loading && <div className="dir-loading error">⚠ {activeError.msg}</div>}
          {currentDoc && (
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
              {currentDoc.tree.children?.map((child, i) => (
                <DirectoryNode
                  key={`root/${i}`}
                  node={child}
                  path={`root/${i}`}
                  selectedPath={selectedPath}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          )}
        </aside>

        <main className="siddur-content">
          {currentDoc && selectedNode ? (
            <article className="hebrew-text">
              <TextNode node={selectedNode} depth={0} />
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
