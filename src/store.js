import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apply } from './logic';
import { seed, CATALOG } from './seed';
import { backfillPosters, hasPosters } from './posters';

const KEY = 'mr.state.v1';
const Ctx = createContext(null);

// Saved state predates the poster fields, so top movies up from the catalogue
// rather than wiping what the user has already posted.
function migrate(s) {
  const byId = Object.fromEntries(CATALOG.map((m) => [m.id, m]));
  return {
    ...s,
    movies: (s.movies || []).map((m) => {
      const c = byId[m.id];
      if (!c) return m;
      return {
        ...c, ...m,
        image: m.image || c.image,
        color: m.color || c.color,
        language: m.language || c.language,
        runtime: m.runtime || c.runtime,
      };
    }),
  };
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const timer = useRef(null);
  const filled = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        setState(parsed && parsed.v === 1 ? migrate(parsed) : seed());
      } catch {
        setState(seed());
      }
    })();
  }, []);

  useEffect(() => {
    if (state) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  // Once per launch, fetch real posters for anything still on a placeholder.
  useEffect(() => {
    if (!state || !hasPosters || filled.current) return;
    filled.current = true;
    backfillPosters(state.movies).then((patch) => {
      if (!patch) return;
      setState((prev) => prev && ({
        ...prev,
        movies: prev.movies.map((m) => (patch[m.id] ? { ...m, ...patch[m.id] } : m)),
      }));
    }).catch(() => {});
  }, [state]);

  const flash = (msg, isError) => {
    clearTimeout(timer.current);
    if (isError) { setError(msg); setToast(''); } else { setToast(msg); setError(''); }
    timer.current = setTimeout(() => { setToast(''); setError(''); }, 3600);
  };

  // Single write path. Refusals surface as a message, never a silent no-op.
  const run = (action) => {
    if (!state) return {};
    const res = apply(state, action);
    if (res.error) { flash(res.error, true); return {}; }
    setState(res.state);
    if (res.toast) flash(res.toast, false);
    return res;
  };

  const reset = () => { setState(seed()); flash('Scenario reset.', false); };

  return (
    <Ctx.Provider value={{ state, run, reset, toast, error, flash }}>
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);
