/**
 * Text sanitiser for fetched content (Sefaria, etc.).
 *
 * Source text carries HTML entities and markup — &thinsp;, &nbsp;, <br>, <sup>
 * footnotes, and Sefaria's ";|" segment separators — which otherwise render
 * literally. cleanText strips tags, decodes/removes entities, and drops stray
 * pipes, while leaving every Hebrew letter, nikud, ta'am, and punctuation mark
 * (־ ׃ ׳ ״ …) untouched. Pure function; shared by every platform.
 */
const NAMED_ENT: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', thinsp: ' ', ensp: ' ', emsp: ' ', hairsp: ' ', shy: '',
  ndash: '–', mdash: '—', hellip: '…',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
};

export function cleanText(input: string | null | undefined): string {
  if (input == null) return '';
  return String(input)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => { const n = parseInt(h, 16); return n < 32 ? ' ' : String.fromCodePoint(n); })
    .replace(/&#(\d+);?/g, (_, d) => { const n = parseInt(d, 10); return n < 32 ? ' ' : String.fromCodePoint(n); })
    .replace(/&(nbsp|thinsp|ensp|emsp|hairsp|shy|amp|lt|gt|quot|apos|ndash|mdash|hellip|[lr]squo|[lr]dquo)\b;?/gi, (_, name: string) => NAMED_ENT[name.toLowerCase()])
    .replace(/&([a-z][a-z0-9]*);/gi, (_, name: string) => { const k = name.toLowerCase(); return k in NAMED_ENT ? NAMED_ENT[k] : ''; })
    .replace(/[\s;|]*[{(]\s*[פס]\s*[})][\s;|]*/g, ' ')
    .replace(/\s*;\s*\|/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[ \t ]{2,}/g, ' ')
    .replace(/[ \t ]+([,.;:!?])/g, '$1')
    .trim();
}
