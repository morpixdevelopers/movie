import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Light and dark, switchable at runtime.
 *
 * StyleSheet.create copies colour values at the moment it runs, so a style
 * built at import time can never follow a theme change. Rather than move 47
 * components onto a hook, every style file wraps its sheet in makeStyles():
 * the sheet is then built once per palette, cached, and resolved through a
 * proxy on each property read. Components keep using `st.card` and `C.accent`
 * exactly as before and pick up the new palette on the next render.
 *
 * Two rules hold in both palettes, because breaking either is what makes a
 * theme switch look broken:
 *
 *  1. An accent needs TWO values. #d81b46 does both jobs on white — 5.0 as a
 *     fill under white text, 5.0 as text on the page. On black it cannot: as
 *     text it drops to 3.8. So accentFill is what you sit on, accent is what
 *     you read, and on light they happen to coincide.
 *
 *  2. Nothing borrows another role's colour. A toast that uses `text` as its
 *     background inverts the moment the palette flips, so it owns a pair.
 *
 * Every pairing is verified against WCAG AA (4.5:1 for body text).
 */

const PALETTES = {
  light: {
    dark: false,

    bg: '#f7f8fa',
    panel: '#ffffff',
    panelHi: '#eef1f6',
    line: '#e6eaf1',
    lineSoft: '#f0f2f6',

    accent: '#d81b46',     // AS TEXT — 5.0 on white
    accentHi: '#FF9DB0',   // AS TEXT over a dark poster scrim, so light in both
    accentFill: '#d81b46', // AS A SURFACE — 5.0 under white
    gradA: '#E02B52',      // the old #ff4d6d only reached 3.2 under white
    gradB: '#d81b46',
    onAccent: '#ffffff',

    amber: '#8a6100',
    text: '#0f1420',
    muted: '#5b6373',
    dim: '#69727e',
    good: '#137a45',

    input: '#ffffff',
    sheet: '#ffffff',
    overlay: 'rgba(12,16,26,0.5)',
    chip: '#eef1f6',
    tint: 'rgba(216,27,70,0.07)',
    tintLine: 'rgba(216,27,70,0.3)',

    toastBg: '#0f1420',
    toastText: '#ffffff',
    barStyle: 'dark-content',
  },

  // The same red as light. Only the surfaces change.
  //
  // Neutral greys, not red-tinted ones — a warm undertone in the darks reads
  // as brown next to the red.
  //
  // One number to know: #d81b46 as small TEXT on black is 3.2:1, under the
  // 4.5 that WCAG AA asks for body text (it clears the 3.0 bar for large or
  // bold text). Keeping the brand red identical across both themes was the
  // explicit call; `accent` below is the single line to lift if red links
  // ever turn out to be hard to read on a phone outdoors.
  dark: {
    dark: true,

    bg: '#000000',
    panel: '#121212',     // cards
    panelHi: '#1E1E1E',   // chips, inputs, pressed states
    line: '#2A2A2A',
    lineSoft: '#191919',

    accent: '#d81b46',     // AS TEXT — identical to light
    accentHi: '#FF9DB0',   // AS TEXT over a dark poster scrim
    accentFill: '#d81b46', // AS A SURFACE — 5.0 under white
    gradA: '#E02B52',
    gradB: '#d81b46',
    onAccent: '#ffffff',

    amber: '#FFC98A',
    text: '#ffffff',
    muted: '#AFAFAF',
    dim: '#949494',
    good: '#5FD39A',

    input: '#121212',
    sheet: '#121212',
    overlay: 'rgba(0,0,0,0.78)',
    chip: '#1E1E1E',
    // same red, lifted in opacity so the wash is still visible on black
    tint: 'rgba(216,27,70,0.16)',
    tintLine: 'rgba(216,27,70,0.45)',

    toastBg: '#ffffff',
    toastText: '#000000',
    barStyle: 'light-content',
  },
};

// Scrims burned over posters. A poster is a photograph, not a surface, so
// these stay dark in both palettes.
const FIXED = { ink: '#0f1420', onImage: '#ffffff' };

export const S = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40,
  radius: 18,
  radiusSm: 12,
  radiusXs: 8,
};

export const MODES = ['auto', 'light', 'dark'];
const KEY = 'mr.theme.v1';

// The resolved palette name. Set by ThemeProvider before its children render,
// and read by every proxy below.
let active = 'light';

const paletteOf = (m) => ({ ...PALETTES[m], ...FIXED });
const PAL_CACHE = {};
const pal = (m) => (PAL_CACHE[m] || (PAL_CACHE[m] = paletteOf(m)));

const proxy = (resolve) => new Proxy({}, {
  get: (_, k) => resolve()[k],
  has: (_, k) => k in resolve(),
  ownKeys: () => Reflect.ownKeys(resolve()),
  getOwnPropertyDescriptor: (_, k) => ({
    value: resolve()[k], enumerable: true, configurable: true,
  }),
});

export const C = proxy(() => pal(active));

const shadowFor = (c, level) => {
  // On dark a drop shadow is nearly invisible — depth comes from the surface
  // ramp (bg -> panel -> panelHi) and these only seat a card against the page.
  const scale = c.dark
    ? [{ o: 0.34, r: 8, y: 2, e: 1 }, { o: 0.42, r: 18, y: 6, e: 3 }, { o: 0.55, r: 30, y: 14, e: 7 }]
    : [{ o: 0.05, r: 6, y: 2, e: 1 }, { o: 0.07, r: 14, y: 6, e: 3 }, { o: 0.10, r: 26, y: 12, e: 7 }];
  const cfg = scale[level - 1] || scale[1];
  return Platform.select({
    ios: {
      shadowColor: c.dark ? '#000000' : '#101828',
      shadowOpacity: cfg.o,
      shadowRadius: cfg.r,
      shadowOffset: { width: 0, height: cfg.y },
    },
    android: { elevation: cfg.e },
    default: {},
  });
};

export const shadow = (level = 1) => shadowFor(pal(active), level);

const fontsFor = (c) => ({
  display: { fontSize: 32, fontWeight: '800', color: c.text, letterSpacing: -1.1, lineHeight: 37 },
  h1: { fontSize: 25, fontWeight: '800', color: c.text, letterSpacing: -0.7, lineHeight: 30 },
  h2: { fontSize: 19, fontWeight: '800', color: c.text, letterSpacing: -0.4 },
  h3: { fontSize: 15, fontWeight: '700', color: c.text },
  body: { fontSize: 14.5, color: c.text, lineHeight: 21 },
  small: { fontSize: 13, color: c.muted, lineHeight: 19 },
  tiny: { fontSize: 11.5, color: c.muted, lineHeight: 16 },
  label: { fontSize: 10, color: c.muted, letterSpacing: 1.4, fontWeight: '800' },
});
const F_CACHE = {};
const fonts = (m) => (F_CACHE[m] || (F_CACHE[m] = fontsFor(pal(m))));

export const F = proxy(() => fonts(active));

/**
 * Wrap a style sheet so it follows the theme.
 *
 *   const st = makeStyles((C, S, F, shadow) => StyleSheet.create({ ... }));
 *
 * The sheet body is unchanged — C, F and shadow arrive as arguments, so each
 * palette's sheet is built against its own colours rather than whichever
 * palette happened to be active at import time.
 */
export function makeStyles(build) {
  const cache = {};
  const sheet = () => {
    const m = active;
    if (!cache[m]) cache[m] = build(pal(m), S, fonts(m), (l = 1) => shadowFor(pal(m), l));
    return cache[m];
  };
  return proxy(sheet);
}

const Ctx = createContext({ mode: 'light', resolved: 'light', setMode: () => {} });

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setMode] = useState('light');   // the default until someone chooses
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (MODES.includes(v)) setMode(v); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const resolved = mode === 'auto' ? (system === 'light' ? 'light' : 'dark') : mode;
  // set before children render, so their proxies resolve to the right palette
  active = resolved;

  const choose = (m) => {
    if (!MODES.includes(m)) return;
    setMode(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  // hold the first frame rather than flash the wrong theme while the stored
  // choice is still being read
  if (!ready) return null;

  return <Ctx.Provider value={{ mode, resolved, setMode: choose }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
