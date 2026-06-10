/**
 * Tiny cross-platform key/value persistence.
 *
 * Web uses localStorage. Native currently falls back to an in-memory map so the
 * first slice runs with zero extra native dependencies; swap in
 * `@react-native-async-storage/async-storage` here later without touching callers.
 */
import { Platform } from 'react-native';

const mem = new Map<string, string>();

export const storage = {
  get(key: string): string | null {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return mem.has(key) ? mem.get(key)! : null;
  },
  set(key: string, value: string): void {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* ignore quota / privacy-mode errors */
      }
      return;
    }
    mem.set(key, value);
  },
};

export function getJSON<T>(key: string, fallback: T): T {
  const raw = storage.get(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
