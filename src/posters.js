// Real movie posters by title, straight from IMDb — no API key.
//
// Route taken and why:
//   TMDB    — DNS-hijacked by many Indian ISPs (site AND api resolve to a
//             block page), so unusable for this audience.
//   OMDb    — reachable, but needs a key and caps at 1,000 calls/day.
//   IMDb    — the suggestion endpoint imdb.com's own search box calls is
//             public, keyless, and returns poster images. Used here.
//
// CAVEAT: that endpoint is undocumented and unsupported. Fine for a prototype;
// before shipping commercially, move to a licensed source (TMDB, OMDb paid, or
// IMDb's official API) — the call sites below are the only thing that changes.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const hasPosters = true; // no key required

const HOST = 'https://v2.sg.media-imdb.com/suggestion';
const CACHE_KEY = 'mr.posters.cache.v2';
const TTL = 1000 * 60 * 60 * 24 * 14;

let cache = null;
let loading = null;

async function loadCache() {
  if (cache) return cache;
  if (!loading) {
    loading = AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => { cache = raw ? JSON.parse(raw) : {}; return cache; })
      .catch(() => { cache = {}; return cache; });
  }
  return loading;
}

function persist() {
  if (!cache) return;
  const keys = Object.keys(cache);
  if (keys.length > 300) {
    keys.sort((a, b) => cache[a].at - cache[b].at)
      .slice(0, keys.length - 300)
      .forEach((k) => delete cache[k]);
  }
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch(() => {});
}

/** IMDb returns a base image ref; the size suffix has to be appended. */
export function sizedPoster(imageUrl, width = 500) {
  if (!imageUrl) return null;
  return `${imageUrl}._V1_SX${width}.jpg`;
}

function fromImdb(r) {
  const img = r.i && r.i.imageUrl;
  return {
    imdbId: r.id,
    title: r.l,
    year: r.y || null,
    posterUrl: sizedPoster(img),
    cast: r.s || '',
  };
}

/** Search IMDb by title. Returns [] on any failure — never throws. */
export async function searchTitles(query, { limit = 8 } = {}) {
  const raw = String(query || '').trim();
  if (raw.length < 2) return [];

  const c = await loadCache();
  const k = 's:' + raw.toLowerCase();
  if (c[k] && Date.now() - c[k].at < TTL) return c[k].v.slice(0, limit);

  // the endpoint is /suggestion/{first letter}/{query with spaces stripped}.json
  const slug = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!slug) return [];

  try {
    const res = await fetch(`${HOST}/${slug[0]}/${encodeURIComponent(slug)}.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const out = (json.d || [])
      // drop people, TV events and IMDb pages — films only
      .filter((r) => typeof r.id === 'string' && r.id.startsWith('tt'))
      .filter((r) => r.qid === 'movie' || r.qid === 'tvMovie')
      .map(fromImdb)
      .filter((m) => m.title)
      .sort((a, b) => (b.posterUrl ? 1 : 0) - (a.posterUrl ? 1 : 0))
      .slice(0, 12);
    c[k] = { at: Date.now(), v: out };
    persist();
    return out.slice(0, limit);
  } catch {
    return [];
  }
}

/** Best single match, disambiguated by year when given. */
export async function resolveTitle(title, year) {
  const results = await searchTitles(title, { limit: 12 });
  if (!results.length) return null;
  const want = String(title).trim().toLowerCase();
  const exact = results.filter((r) => String(r.title).trim().toLowerCase() === want);
  const pool = exact.length ? exact : results;
  if (year) {
    const sameYear = pool.find((r) => r.year === Number(year));
    if (sameYear) return sameYear;
  }
  return pool.find((r) => r.posterUrl) || pool[0];
}

/**
 * Fill in posters for movies that don't have one.
 * Returns { movieId: {imdbId, posterUrl, year} } or null if nothing changed,
 * so the caller merges it into state in one update.
 */
export async function backfillPosters(movies, { max = 12 } = {}) {
  const pending = movies
    .filter((m) => !m.posterUrl && m.imdbId !== null)
    .slice(0, max);
  if (!pending.length) return null;

  const patch = {};
  for (const m of pending) {
    const hit = await resolveTitle(m.title, m.year);
    if (hit && hit.posterUrl) {
      patch[m.id] = { imdbId: hit.imdbId, posterUrl: hit.posterUrl, year: m.year || hit.year };
    } else {
      patch[m.id] = { imdbId: null }; // remember the miss; don't retry every launch
    }
  }
  return Object.keys(patch).length ? patch : null;
}
