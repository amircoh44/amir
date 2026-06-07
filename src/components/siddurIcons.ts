// Ritual-instruction icons that can be attached to the start of a prayer line.
export interface IconDef {
  id: string;
  symbol: string;
  label: string; // Hebrew label shown in the picker
}

export const SIDDUR_ICONS: IconDef[] = [
  { id: 'bow', symbol: '🙇', label: 'כורעים / משתחווים' },
  { id: 'stand', symbol: '🧍', label: 'עומדים' },
  { id: 'sit', symbol: '🪑', label: 'יושבים' },
  { id: 'crowd', symbol: '👥', label: 'הקהל' },
  { id: 'chazan', symbol: '🎤', label: 'חזן' },
  { id: 'both', symbol: '🗣️', label: 'חזן והקהל' },
  { id: 'lulav', symbol: '🌿', label: 'נענוע לולב' },
  { id: 'aloud', symbol: '🔊', label: 'בקול רם' },
  { id: 'silent', symbol: '🤫', label: 'בלחש' },
  { id: 'steps', symbol: '👣', label: 'שלוש פסיעות' },
];

export const ICON_BY_ID: Record<string, IconDef> = Object.fromEntries(
  SIDDUR_ICONS.map((i) => [i.id, i]),
);

// An annotation is one or two icons with an optional logic connector between
// them: '+' means "and" (both apply), '/' means "or" (either, by custom).
export type Connector = '+' | '/';
export interface Annotation {
  i1: string;
  conn?: Connector;
  i2?: string;
}
