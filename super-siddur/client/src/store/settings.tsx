/**
 * App-wide settings: davening location, time format, and nusach.
 * Persisted via the cross-platform storage helper, so the siddur keeps your
 * place offline.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { CITIES, type Loc } from '@/core/engine';
import { getJSON, setJSON } from '@/store/storage';

export type Nusach = 'ashkenaz' | 'sefard' | 'edot' | 'ari';
export type TimeFmt = '12' | '24';

interface Settings {
  loc: Loc;
  timeFmt: TimeFmt;
  nusach: Nusach;
  israelMode: boolean;
}

interface SettingsCtx extends Settings {
  setLoc: (loc: Loc) => void;
  setTimeFmt: (f: TimeFmt) => void;
  setNusach: (n: Nusach) => void;
  setIsraelMode: (b: boolean) => void;
}

const KEY = 'siddur.settings.v1';
const DEFAULT: Settings = {
  loc: CITIES.find((c) => c.name === 'Jerusalem')!,
  timeFmt: '12',
  nusach: 'ashkenaz',
  israelMode: false,
};

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Settings>(() => getJSON<Settings>(KEY, DEFAULT));

  const persist = useCallback((next: Settings) => {
    setS(next);
    setJSON(KEY, next);
  }, []);

  const value = useMemo<SettingsCtx>(
    () => ({
      ...s,
      setLoc: (loc) => persist({ ...s, loc }),
      setTimeFmt: (timeFmt) => persist({ ...s, timeFmt }),
      setNusach: (nusach) => persist({ ...s, nusach }),
      setIsraelMode: (israelMode) => persist({ ...s, israelMode }),
    }),
    [s, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used within <SettingsProvider>');
  return v;
}
