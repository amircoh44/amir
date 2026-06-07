import { useCallback, useState } from 'react';
import type { Annotation } from '../components/siddurIcons';

export type AnnotationMap = Record<string, Annotation>;

function read(storageKey: string): AnnotationMap {
  if (!storageKey) return {};
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as AnnotationMap) : {};
  } catch {
    return {};
  }
}

/**
 * Per-nusach line annotations, persisted in localStorage so a user's markings
 * survive reloads. Keyed by an absolute line id (heTitle trail + index).
 */
export function useAnnotations(nusachKey: string | undefined) {
  const storageKey = nusachKey ? `siddur:annot:${nusachKey}` : '';
  const [map, setMap] = useState<AnnotationMap>(() => read(storageKey));
  const [loadedKey, setLoadedKey] = useState(storageKey);

  // Reload when the active nusach changes (adjust state during render — no effect).
  if (storageKey !== loadedKey) {
    setLoadedKey(storageKey);
    setMap(read(storageKey));
  }

  const update = useCallback(
    (id: string, annotation: Annotation | null) => {
      setMap((prev) => {
        const next = { ...prev };
        if (annotation) next[id] = annotation;
        else delete next[id];
        try {
          if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* ignore quota / unavailable storage */
        }
        return next;
      });
    },
    [storageKey],
  );

  const clearAll = useCallback(() => {
    setMap({});
    try {
      if (storageKey) localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  return { map, update, clearAll };
}
