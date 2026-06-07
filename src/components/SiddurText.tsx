import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MissingEntry, NusachEntry, SiddurDoc, SiddurIndex, SiddurNode } from '../types/siddur';
import { useAnnotations, type AnnotationMap } from '../hooks/useAnnotations';
import { ICON_BY_ID, SIDDUR_ICONS, type Annotation, type Connector } from './siddurIcons';
import {
  buildFindRegex,
  collectMatches,
  countMatches,
  mapTreeLines,
  treeToText,
  type FindOptions,
  type MatchResult,
} from '../lib/siddurText';
import './SiddurText.css';

const BASE = `${import.meta.env.BASE_URL}siddur`;
type Panel = 'directory' | 'missing' | 'results';

/** A leaf with no Hebrew text is "missing". */
function isMissing(node: SiddurNode): boolean {
  return !node.children?.length && !(node.lines && node.lines.length > 0);
}

function findByPath(root: SiddurNode, path: string[]): SiddurNode | null {
  let cur: SiddurNode | undefined = root;
  for (const title of path) {
    cur = cur?.children?.find((c) => (c.heTitle || c.enTitle) === title);
    if (!cur) return null;
  }
  return cur ?? null;
}

const lineId = (trail: string[], i: number) => `${trail.join('›')}#${i}`;

// ---- annotation context (avoids deep prop drilling through TextNode) --------
interface AnnotCtx {
  annotations: AnnotationMap;
  annotateMode: boolean;
  pickerId: string | null;
  setPickerId: (id: string | null) => void;
  updateAnnot: (id: string, a: Annotation | null) => void;
  findRegex: RegExp | null;
}
const Ctx = createContext<AnnotCtx | null>(null);

/** Split a line on a regex, wrapping matches in <mark>. */
function highlight(line: string, re: RegExp | null) {
  if (!re) return line;
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = g.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    out.push(<mark key={k++}>{m[0]}</mark>);
    last = m.index + m[0].length;
    if (m.index === g.lastIndex) g.lastIndex++;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function IconBadges({ a }: { a: Annotation }) {
  const s1 = ICON_BY_ID[a.i1]?.symbol;
  const s2 = a.i2 ? ICON_BY_ID[a.i2]?.symbol : undefined;
  return (
    <span className="line-icons" title="סימון">
      {s1}
      {s2 && <span className="conn">{a.conn ?? '+'}</span>}
      {s2}
    </span>
  );
}

function IconPicker({
  value,
  onChange,
  onClose,
}: {
  value: Annotation | undefined;
  onChange: (a: Annotation | null) => void;
  onClose: () => void;
}) {
  const a = value;
  const pick = (id: string) => {
    if (!a) onChange({ i1: id });
    else if (!a.i2 && a.i1 !== id) onChange({ ...a, i2: id });
    else onChange({ i1: id }); // reset to a single icon
  };
  const cycleConn = () => {
    if (!a?.i2) return;
    const next: Record<string, Connector | undefined> = { '+': '/', '/': undefined } as const;
    onChange({ ...a, conn: a.conn ? next[a.conn] : '+' });
  };
  return (
    <div className="icon-picker" onClick={(e) => e.stopPropagation()}>
      <div className="picker-current">
        {a ? (
          <>
            <button className="slot" title="הסר סמל" onClick={() => onChange(a.i2 ? { i1: a.i2 } : null)}>
              {ICON_BY_ID[a.i1]?.symbol}
            </button>
            <button className="conn-btn" onClick={cycleConn} disabled={!a.i2} title="לוגיקה בין הסמלים (וגם / או)">
              {a.i2 ? (a.conn ?? '+') : '·'}
            </button>
            <button
              className="slot"
              title={a.i2 ? 'הסר סמל' : 'בחר סמל שני מהרשימה'}
              onClick={() => a.i2 && onChange({ i1: a.i1 })}
            >
              {a.i2 ? ICON_BY_ID[a.i2]?.symbol : '＋'}
            </button>
          </>
        ) : (
          <span className="picker-hint">בחר סמל אחד או שניים:</span>
        )}
      </div>
      <div className="picker-grid">
        {SIDDUR_ICONS.map((ic) => (
          <button key={ic.id} className="picker-icon" title={ic.label} onClick={() => pick(ic.id)}>
            <span>{ic.symbol}</span>
            <small>{ic.label}</small>
          </button>
        ))}
      </div>
      <div className="picker-actions">
        <button className="picker-clear" onClick={() => onChange(null)}>🗑 נקה</button>
        <button className="picker-done" onClick={onClose}>סיום</button>
      </div>
    </div>
  );
}

function Line({ id, line }: { id: string; line: string }) {
  const ctx = useContext(Ctx)!;
  const a = ctx.annotations[id];
  const picking = ctx.pickerId === id;
  return (
    <div className="line-wrap">
      <p
        className={`text-line ${ctx.annotateMode ? 'annotatable' : ''} ${picking ? 'picking' : ''}`}
        onClick={ctx.annotateMode ? () => ctx.setPickerId(picking ? null : id) : undefined}
      >
        {a && <IconBadges a={a} />}
        {highlight(line, ctx.findRegex)}
      </p>
      {picking && (
        <IconPicker
          value={a}
          onChange={(na) => ctx.updateAnnot(id, na)}
          onClose={() => ctx.setPickerId(null)}
        />
      )}
    </div>
  );
}

function TextNode({ node, depth, trail }: { node: SiddurNode; depth: number; trail: string[] }) {
  const headingTag = `h${Math.min(depth + 2, 6)}`;
  const here = node.heTitle ? [...trail, node.heTitle] : trail;
  return (
    <section className="text-section">
      {node.heTitle && createElement(headingTag, { className: 'text-heading' }, node.heTitle)}
      {isMissing(node) && <p className="text-missing">⚠ אין טקסט במקור (text missing in source)</p>}
      {node.lines?.map((line, i) => (
        <Line key={i} id={lineId(here, i)} line={line} />
      ))}
      {node.children?.map((child, i) => (
        <TextNode key={i} node={child} depth={depth + 1} trail={here} />
      ))}
    </section>
  );
}

function DirectoryNode({
  node,
  path,
  trail,
  selectedPath,
  annotations,
  onSelect,
}: {
  node: SiddurNode;
  path: string;
  trail: string[];
  selectedPath: string;
  annotations: AnnotationMap;
  onSelect: (path: string, node: SiddurNode, trail: string[]) => void;
}) {
  const [open, setOpen] = useState(path.split('/').length <= 1);
  const hasChildren = !!node.children?.length;
  const label = node.heTitle || node.enTitle || '—';
  const missing = isMissing(node);
  const childTrail = node.heTitle ? [...trail, node.heTitle] : trail;

  return (
    <li className="dir-item">
      <div className={`dir-row ${selectedPath === path ? 'selected' : ''}`}>
        {hasChildren ? (
          <button className="dir-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="dir-toggle leaf">{missing ? '⚠' : '•'}</span>
        )}
        <button
          className={`dir-label ${missing ? 'missing' : ''}`}
          onClick={() => onSelect(path, node, trail)}
        >
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
              trail={childTrail}
              selectedPath={selectedPath}
              annotations={annotations}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function SiddurText() {
  const [index, setIndex] = useState<SiddurIndex | null>(null);
  const [active, setActive] = useState<NusachEntry | null>(null);
  const [doc, setDoc] = useState<SiddurDoc | null>(null);
  const [edited, setEdited] = useState(false);
  const [selectedPath, setSelectedPath] = useState('root');
  const [selectedNode, setSelectedNode] = useState<SiddurNode | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<string[]>([]);
  const [error, setError] = useState<{ scope: string; msg: string } | null>(null);
  const [panel, setPanel] = useState<Panel>('directory');

  // find / replace
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [opts, setOpts] = useState<FindOptions>({
    matchCase: false,
    ignoreNikkud: true,
    wholeWord: false,
    regex: false,
  });
  const [searchAll, setSearchAll] = useState(false);
  const [allDocs, setAllDocs] = useState<Record<string, SiddurDoc>>({});
  const [matchIdx, setMatchIdx] = useState(-1);
  const [replaceInfo, setReplaceInfo] = useState('');
  const contentRef = useRef<HTMLElement>(null);
  // Cross-nusach navigation that must wait for the target doc to load.
  const pendingNav = useRef<MatchResult | null>(null);

  // annotations
  const [annotateMode, setAnnotateMode] = useState(false);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const { map: annotations, update: updateAnnot, clearAll: clearAnnots } = useAnnotations(active?.key);

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
        setEdited(false);
        const nav = pendingNav.current;
        if (nav && nav.key === d.key) {
          pendingNav.current = null;
          const node = findByPath(d.tree, nav.trail);
          setSelectedPath('');
          setSelectedNode(node ?? d.tree);
          setSelectedTrail(nav.trail.slice(0, -1));
        } else {
          const first = d.tree.children?.[0];
          setSelectedPath(first ? 'root/0' : 'root');
          setSelectedNode(first ?? d.tree);
          setSelectedTrail([]); // first/root sit at the top level
        }
      })
      .catch((e) => !ignore && setError({ scope: active.key, msg: String(e.message ?? e) }));
    return () => {
      ignore = true;
    };
  }, [active]);

  // When "search all nuschaot" is on, lazily fetch + cache every nusach doc.
  useEffect(() => {
    if (!searchAll || !index) return;
    let ignore = false;
    for (const n of index.nuschaot) {
      if (allDocs[n.key]) continue;
      fetch(`${BASE}/${n.file}`)
        .then((r) => (r.ok ? (r.json() as Promise<SiddurDoc>) : null))
        .then((d) => {
          if (!ignore && d) setAllDocs((prev) => ({ ...prev, [d.key]: d }));
        })
        .catch(() => undefined);
    }
    return () => {
      ignore = true;
    };
  }, [searchAll, index, allDocs]);

  const loading = !!active && doc?.key !== active.key && error?.scope !== active.key;
  const currentDoc = doc && active && doc.key === active.key ? doc : null;
  const activeError = error?.scope === active?.key ? error : null;

  const findRegex = useMemo(() => buildFindRegex(findText.trim(), opts, false), [findText, opts]);

  // Derive the match total from the displayed section (no DOM / effect needed).
  const matchCount = useMemo(
    () => (findRegex && selectedNode ? countMatches(selectedNode, findRegex) : 0),
    [findRegex, selectedNode],
  );

  // Results list: current nusach, or all nuschaot when enabled.
  const results = useMemo(() => {
    if (!findRegex || !index) return [];
    const docs: SiddurDoc[] = searchAll
      ? index.nuschaot
          .map((n) => (n.key === active?.key ? currentDoc : allDocs[n.key]))
          .filter((d): d is SiddurDoc => !!d)
      : currentDoc
        ? [currentDoc]
        : [];
    return docs.flatMap((d) => collectMatches(d.tree, findRegex, d.key, 300));
  }, [findRegex, searchAll, allDocs, currentDoc, index, active]);

  const scrollPending = useRef(false);
  useEffect(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    requestAnimationFrame(() => {
      contentRef.current?.querySelector('mark')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [selectedNode]);

  const handleResultSelect = useCallback(
    (r: MatchResult) => {
      scrollPending.current = true;
      const target = r.key === active?.key ? currentDoc : allDocs[r.key];
      if (r.key !== active?.key) {
        const entry = index?.nuschaot.find((n) => n.key === r.key);
        if (entry) {
          pendingNav.current = r;
          setActive(entry);
          return;
        }
      }
      if (target) {
        const node = findByPath(target.tree, r.trail);
        setSelectedPath('');
        setSelectedNode(node ?? target.tree);
        setSelectedTrail(r.trail.slice(0, -1));
      }
    },
    [active, currentDoc, allDocs, index],
  );

  const handleSelect = useCallback((path: string, node: SiddurNode, trail: string[]) => {
    setSelectedPath(path);
    setSelectedNode(node);
    setSelectedTrail(trail);
    setPickerId(null);
    setMatchIdx(-1);
  }, []);

  const handleMissingSelect = useCallback(
    (entry: MissingEntry) => {
      if (!currentDoc) return;
      const node = findByPath(currentDoc.tree, entry.path) ?? { heTitle: entry.heTitle, lines: [] };
      setSelectedPath('');
      setSelectedNode(node);
      setSelectedTrail(entry.path.slice(0, -1));
      setPanel('directory');
    },
    [currentDoc],
  );

  const jump = useCallback((dir: 1 | -1) => {
    const marks = contentRef.current?.querySelectorAll<HTMLElement>('mark');
    if (!marks || !marks.length) return;
    setMatchIdx((prev) => {
      const n = (prev + dir + marks.length) % marks.length;
      marks.forEach((x) => x.classList.remove('current'));
      marks[n].classList.add('current');
      marks[n].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return n;
    });
  }, []);

  const handleReplaceAll = useCallback(() => {
    if (!currentDoc || !findText.trim()) return;
    const re = buildFindRegex(findText.trim(), opts, true);
    if (!re) return;
    const before = countMatches(currentDoc.tree, re);
    if (!before) {
      setReplaceInfo('אין התאמות');
      return;
    }
    const fn = (line: string) => line.replace(re, replaceText);
    setDoc({ ...currentDoc, tree: mapTreeLines(currentDoc.tree, fn) });
    setSelectedNode((prev) => (prev ? mapTreeLines(prev, fn) : prev));
    setEdited(true);
    setReplaceInfo(`הוחלפו ${before} מופעים`);
  }, [currentDoc, findText, replaceText, opts]);

  const handleDownload = useCallback(() => {
    if (!active) return;
    if (edited && currentDoc) {
      const text = treeToText(currentDoc.tree, currentDoc.heTitle);
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${active.key}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      const a = document.createElement('a');
      a.href = `${BASE}/${active.text}`;
      a.download = `${active.key}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }, [active, edited, currentDoc]);

  if (error?.scope === 'index' && !index) return <div className="siddur error">⚠ {error.msg}</div>;
  if (!index) return <div className="siddur loading">Loading Siddur Text…</div>;

  const ctxValue: AnnotCtx = {
    annotations,
    annotateMode,
    pickerId,
    setPickerId,
    updateAnnot,
    findRegex,
  };

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
                setPanel('directory');
                setReplaceInfo('');
              }}
            >
              <span className="nusach-he">{n.nusachHe}</span>
              <span className="nusach-en">{n.title}</span>
            </button>
          ))}
        </div>
        <div className="siddur-meta">
          <button
            className={`mode-btn ${annotateMode ? 'active' : ''}`}
            onClick={() => {
              setAnnotateMode((m) => !m);
              setPickerId(null);
            }}
            title="סימון קטעים בסמלים"
          >
            ✎ סימון {annotateMode ? '(פעיל)' : ''}
          </button>
          <button className="download-btn" onClick={handleDownload} disabled={!active}>
            ⬇ הורד טקסט עברי{edited ? ' *' : ''}
          </button>
        </div>
      </div>

      {/* Find & replace */}
      <div className="siddur-find" dir="rtl">
        <input
          className="find-input"
          type="search"
          placeholder="חיפוש…"
          value={findText}
          onChange={(e) => {
            setFindText(e.target.value);
            setMatchIdx(-1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && jump(e.shiftKey ? -1 : 1)}
        />
        <input
          className="find-input replace"
          type="text"
          placeholder="החלפה…"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
        />
        <div className="find-nav">
          <button onClick={() => jump(-1)} disabled={!matchCount} title="הקודם">▲</button>
          <span className="find-count">{matchCount ? `${matchIdx + 1}/${matchCount}` : '0'}</span>
          <button onClick={() => jump(1)} disabled={!matchCount} title="הבא">▼</button>
        </div>
        <button className="replace-btn" onClick={handleReplaceAll} disabled={!findText.trim()}>
          החלף הכל
        </button>
        <div className="find-opts">
          <label title="התאמת אותיות גדולות/קטנות">
            <input type="checkbox" checked={opts.matchCase} onChange={(e) => setOpts({ ...opts, matchCase: e.target.checked })} />
            Aa
          </label>
          <label title="התעלם מניקוד">
            <input type="checkbox" checked={opts.ignoreNikkud} onChange={(e) => setOpts({ ...opts, ignoreNikkud: e.target.checked })} />
            ניקוד
          </label>
          <label title="מילה שלמה">
            <input type="checkbox" checked={opts.wholeWord} disabled={opts.regex} onChange={(e) => setOpts({ ...opts, wholeWord: e.target.checked })} />
            מילה
          </label>
          <label title="ביטוי רגולרי (regex)">
            <input type="checkbox" checked={opts.regex} onChange={(e) => setOpts({ ...opts, regex: e.target.checked })} />
            regex
          </label>
          <label title="חיפוש בכל הנוסחים">
            <input type="checkbox" checked={searchAll} onChange={(e) => { setSearchAll(e.target.checked); if (e.target.checked) setPanel('results'); }} />
            כל הנוסחים
          </label>
        </div>
        {findText.trim() && (
          <button className={`results-btn ${panel === 'results' ? 'active' : ''}`} onClick={() => setPanel('results')}>
            תוצאות ({results.length}{results.length >= 300 ? '+' : ''})
          </button>
        )}
        {replaceInfo && <span className="replace-info">{replaceInfo}</span>}
      </div>

      <div className="siddur-body" dir="rtl">
        <aside className="siddur-directory">
          <div className="panel-toggle">
            <button className={panel === 'directory' ? 'active' : ''} onClick={() => setPanel('directory')}>
              תוכן עניינים
            </button>
            <button
              className={`${panel === 'missing' ? 'active' : ''} ${active && active.missing > 0 ? 'has-missing' : ''}`}
              onClick={() => setPanel('missing')}
            >
              טקסט חסר{active ? ` (${active.missing})` : ''}
            </button>
          </div>

          {loading && <div className="dir-loading">טוען…</div>}
          {activeError && !loading && <div className="dir-loading error">⚠ {activeError.msg}</div>}

          {currentDoc && panel === 'missing' && (
            <div className="missing-panel">
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

          {currentDoc && panel === 'results' && (
            <div className="results-panel">
              <h4>
                תוצאות חיפוש {searchAll ? '(כל הנוסחים)' : ''} — {results.length}
                {results.length >= 300 ? '+' : ''}
              </h4>
              {!findText.trim() ? (
                <p className="results-empty">הקלד חיפוש למעלה</p>
              ) : results.length === 0 ? (
                <p className="results-empty">אין תוצאות</p>
              ) : (
                <ul className="results-list">
                  {results.map((r, i) => (
                    <li key={i}>
                      <button onClick={() => handleResultSelect(r)}>
                        {searchAll && (
                          <span className="result-nusach">
                            {index.nuschaot.find((n) => n.key === r.key)?.nusachHe ?? r.key}
                          </span>
                        )}
                        <span className="result-trail">{r.trail.join(' › ')}</span>
                        <span className="result-snippet">{r.line.slice(0, 90)}</span>
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
                  <button className="dir-label root" onClick={() => handleSelect('root', currentDoc.tree, [])}>
                    {currentDoc.heTitle}
                  </button>
                </div>
              </li>
              {currentDoc.tree.children?.map((child, i) => (
                <DirectoryNode
                  key={`root/${i}`}
                  node={child}
                  path={`root/${i}`}
                  trail={[]}
                  selectedPath={selectedPath}
                  annotations={annotations}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          )}

          {annotateMode && (
            <div className="annot-help">
              מצב סימון פעיל: לחץ על שורה כדי להוסיף סמלים בתחילתה.
              <button className="annot-clear" onClick={clearAnnots}>נקה את כל הסימונים</button>
            </div>
          )}
        </aside>

        <main className="siddur-content" ref={contentRef}>
          {currentDoc && selectedNode ? (
            <article className="hebrew-text">
              <Ctx.Provider value={ctxValue}>
                <TextNode node={selectedNode} depth={0} trail={selectedTrail} />
              </Ctx.Provider>
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
