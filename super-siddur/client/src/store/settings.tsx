/**
 * App-wide settings & "personal zone": location, display, nusach, and profile.
 * Persisted via the cross-platform storage helper, so the siddur keeps your
 * place offline.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { CITIES, type Loc } from '@/core/engine';
import { getJSON, setJSON } from '@/store/storage';

export type Nusach = 'ashkenaz' | 'sefard' | 'edot' | 'ari';
export type TimeFmt = '12' | '24';
export type ThemePref = 'auto' | 'light' | 'dark';

export interface Settings {
  loc: Loc;
  timeFmt: TimeFmt;
  nusach: Nusach;
  israelMode: boolean;
  themePref: ThemePref;
  userEngName: string;
  userHebName: string;
  /** Gregorian birthday as YYYY-MM-DD, or '' if unset. */
  birthday: string;
}

interface SettingsCtx extends Settings {
  update: (patch: Partial<Settings>) => void;
}

const KEY = 'siddur.settings.v2';
const DEFAULT: Settings = {
  loc: CITIES.find((c) => c.name === 'Jerusalem')!,
  timeFmt: '12',
  nusach: 'ashkenaz',
  israelMode: false,
  themePref: 'auto',
  userEngName: '',
  userHebName: '',
  birthday: '',
};

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Settings>(() => ({ ...DEFAULT, ...getJSON<Partial<Settings>>(KEY, {}) }));

  const update = useCallback((patch: Partial<Settings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      setJSON(KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsCtx>(() => ({ ...s, update }), [s, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used within <SettingsProvider>');
  return v;
}
