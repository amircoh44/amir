// Types for the "Siddur Text" report. Data is produced by
// scripts/download-siddur.mjs into public/siddur/.

export interface SiddurNode {
  enTitle?: string;
  heTitle?: string;
  lines?: string[];
  children?: SiddurNode[];
}

export interface SiddurDoc {
  key: string;
  title: string;
  heTitle: string;
  nusachHe: string;
  language: string;
  source: string;
  versionTitle: string;
  tree: SiddurNode;
}

export interface NusachEntry {
  key: string;
  title: string;
  heTitle: string;
  nusachHe: string;
  source: string;
  lines: number;
  file: string;
  text: string;
}

export interface SiddurIndex {
  name: string;
  generated: string;
  nuschaot: NusachEntry[];
}
