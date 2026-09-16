import { Platform } from 'react-native';

// Light, but poster-forward: deep ink text, soft elevated surfaces, and a
// BookMyShow red that survives being both a fill and a text colour.
export const C = {
  bg: '#f7f8fa',
  panel: '#ffffff',
  panelHi: '#eef1f6',
  line: '#e6eaf1',
  lineSoft: '#f0f2f6',

  accent: '#d81b46',
  accentHi: '#b81038',
  gradA: '#ff4d6d',
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

  ink: '#0f1420',       // for scrims over posters
  onImage: '#ffffff',
};

export const S = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40,
  radius: 18,
  radiusSm: 12,
  radiusXs: 8,
};

// One elevation scale, used everywhere, so cards feel like one material.
export const shadow = (level = 1) => {
  const cfg = [
    { o: 0.05, r: 6, y: 2, e: 1 },
    { o: 0.07, r: 14, y: 6, e: 3 },
    { o: 0.1, r: 26, y: 12, e: 7 },
  ][level - 1] || { o: 0.07, r: 14, y: 6, e: 3 };
  return Platform.select({
    ios: {
      shadowColor: '#101828',
      shadowOpacity: cfg.o,
      shadowRadius: cfg.r,
      shadowOffset: { width: 0, height: cfg.y },
    },
    android: { elevation: cfg.e },
    default: {},
  });
};

export const F = {
  display: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -1.1, lineHeight: 37 },
  h1: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.7, lineHeight: 30 },
  h2: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  h3: { fontSize: 15, fontWeight: '700', color: C.text },
  body: { fontSize: 14.5, color: C.text, lineHeight: 21 },
  small: { fontSize: 13, color: C.muted, lineHeight: 19 },
  tiny: { fontSize: 11.5, color: C.muted, lineHeight: 16 },
  label: { fontSize: 10, color: C.muted, letterSpacing: 1.4, fontWeight: '800' },
};
