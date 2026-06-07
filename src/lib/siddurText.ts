import type { SiddurNode } from '../types/siddur';

export interface FindOptions {
  matchCase: boolean;
  ignoreNikkud: boolean;
  wholeWord: boolean;
  regex: boolean;
}

const NIKKUD = '[\\u0591-\\u05C7]*';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build a RegExp for find/replace honouring the chosen options. */
export function buildFindRegex(find: string, opts: FindOptions, global: boolean): RegExp | null {
  if (!find) return null;
  let body: string;
  if (opts.regex) {
    body = find; // user supplies the pattern verbatim
  } else {
    body = opts.ignoreNikkud ? [...find].map(escapeRegExp).join(NIKKUD) : escapeRegExp(find);
    if (opts.wholeWord) body = `(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`;
  }
  const flags = `${global ? 'g' : ''}${opts.matchCase ? '' : 'i'}u`;
  try {
    return new RegExp(body, flags);
  } catch {
    return null;
  }
}

export interface MatchResult {
  key: string;
  trail: string[]; // absolute heTitle trail to the line's section (incl. it)
  lineIndex: number;
  line: string;
}

/** Collect matching lines across a tree, with their absolute section trail. */
export function collectMatches(
  tree: SiddurNode,
  re: RegExp,
  key: string,
  limit = 500,
): MatchResult[] {
  const out: MatchResult[] = [];
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const visit = (node: SiddurNode, trail: string[]) => {
    const here = node.heTitle ? [...trail, node.heTitle] : trail;
    (node.lines ?? []).forEach((line, i) => {
      if (out.length >= limit) return;
      g.lastIndex = 0;
      if (g.test(line)) out.push({ key, trail: here, lineIndex: i, line });
    });
    for (const c of node.children ?? []) visit(c, here);
  };
  visit(tree, []);
  return out;
}

/** Map a function over every line in a tree, returning a new tree. */
export function mapTreeLines(node: SiddurNode, fn: (line: string) => string): SiddurNode {
  const out: SiddurNode = { ...node };
  if (node.lines) out.lines = node.lines.map(fn);
  if (node.children) out.children = node.children.map((c) => mapTreeLines(c, fn));
  return out;
}

/** Count regex matches across all lines in a tree. */
export function countMatches(node: SiddurNode, re: RegExp): number {
  let n = 0;
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const visit = (x: SiddurNode) => {
    for (const line of x.lines ?? []) n += (line.match(g) ?? []).length;
    for (const c of x.children ?? []) visit(c);
  };
  visit(node);
  return n;
}

/** Flatten a tree into a plain-text Hebrew document (for editing/download). */
export function treeToText(node: SiddurNode, title: string): string {
  const out: string[] = [`# ${title}`, ''];
  const walk = (n: SiddurNode, depth: number) => {
    if (n.heTitle) out.push(`${'#'.repeat(Math.min(depth, 6))} ${n.heTitle}`.trim());
    for (const line of n.lines ?? []) out.push(line);
    for (const c of n.children ?? []) walk(c, depth + 1);
    if (n.children) out.push('');
  };
  for (const c of node.children ?? []) walk(c, 1);
  for (const line of node.lines ?? []) out.push(line);
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
