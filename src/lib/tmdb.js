// Thin wrapper around the TMDB v3 REST API.
// Docs: https://developer.themoviedb.org/reference/intro/getting-started

const RAW_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

// Reject the placeholder string so the app doesn't fire pointless 401s.
const PLACEHOLDER = /your-tmdb|tmdb-v3-api-key|^xxxx+/i;
const API_KEY = !RAW_KEY || PLACEHOLDER.test(RAW_KEY) ? null : RAW_KEY;

export const isTmdbConfigured = Boolean(API_KEY);

function assertConfigured() {
  if (!API_KEY) {
    throw new Error(
      'TMDB API key missing or still set to the placeholder. Add a real VITE_TMDB_API_KEY to .env (get one at https://www.themoviedb.org/settings/api) and restart `npm run dev`.',
    );
  }
}

async function tmdb(path, params = {}) {
  assertConfigured();
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  let res;
  try {
    res = await fetch(url.toString());
  } catch (e) {
    throw new Error(
      "Could not reach TMDB. Check your internet connection or disable ad/tracker blockers " +
        "(uBlock Origin, Brave Shields, Pi-hole) for api.themoviedb.org. " +
        `(${e.message})`,
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.status_message || JSON.stringify(body);
    } catch {
      // not JSON
    }
    if (res.status === 401) {
      throw new Error(
        `TMDB rejected the API key (401). Double-check VITE_TMDB_API_KEY in .env — it should be your TMDB v3 API key. (${detail})`,
      );
    }
    throw new Error(`TMDB ${res.status}: ${detail}`);
  }
  return res.json();
}

// ---------- Letterboxd URL parsing -------------------------------------------------

const LB_REGEX =
  /(?:https?:\/\/)?(?:www\.)?letterboxd\.com\/(?:film|films)\/([a-z0-9][a-z0-9-]*)\/?/i;

/**
 * Parse a Letterboxd film URL or slug into a clean slug.
 * Accepts:
 *   - https://letterboxd.com/film/the-substance/
 *   - letterboxd.com/film/the-substance
 *   - the-substance
 * Returns null if no slug can be extracted.
 */
export function parseLetterboxdSlug(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const m = trimmed.match(LB_REGEX);
  if (m) return m[1].toLowerCase();
  // Bare slug fallback (lowercase letters/digits/hyphens, no spaces).
  if (/^[a-z0-9][a-z0-9-]*$/i.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

/**
 * Convert a Letterboxd slug like `the-substance` or `the-godfather-part-ii`
 * back into a human-readable title for searching ("The Substance",
 * "The Godfather Part II"). Trailing year tokens such as `-2024` are split off
 * and returned as the year hint.
 */
export function slugToQuery(slug) {
  if (!slug) return { title: '', year: undefined };
  const parts = slug.split('-').filter(Boolean);
  let year;
  const last = parts[parts.length - 1];
  if (/^(19|20)\d{2}$/.test(last)) {
    year = Number(last);
    parts.pop();
  }
  const title = parts
    .map((w) => {
      // Roman numerals stay uppercase (II, III, IV, etc.)
      if (/^[ivxlcdm]+$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
  return { title, year };
}

export function buildLetterboxdUrl(slug) {
  if (!slug) return null;
  return `https://letterboxd.com/film/${slug}/`;
}

// ---------- TMDB calls -------------------------------------------------------------

export function searchMovies(query, { year, signal } = {}) {
  if (!query || !query.trim()) return Promise.resolve({ results: [] });
  return tmdb('/search/movie', {
    query: query.trim(),
    include_adult: false,
    language: 'en-US',
    page: 1,
    year,
  }).then((data) => ({
    ...data,
    results: (data.results ?? []).map(normalizeSearchResult),
  }));
  // Note: AbortController support could be added by passing `signal` through
  // a custom fetch. Skipped here to keep this helper minimal.
}

export async function fetchMovieDetails(tmdbId) {
  const data = await tmdb(`/movie/${tmdbId}`, {
    append_to_response: 'credits',
    language: 'en-US',
  });
  return normalizeMovieDetails(data);
}

/**
 * Resolve a Letterboxd slug to a full TMDB movie detail object.
 * Strategy: convert slug → likely title (and possibly year), search TMDB,
 * pick the best candidate, then fetch full details.
 */
export async function resolveFromLetterboxdSlug(slug) {
  const { title, year } = slugToQuery(slug);
  if (!title) throw new Error('Could not parse a title from that Letterboxd URL.');

  // First attempt: title + year hint if present.
  let { results } = await searchMovies(title, { year });
  // Retry without year if nothing came back.
  if ((!results || results.length === 0) && year) {
    ({ results } = await searchMovies(title));
  }
  if (!results || results.length === 0) {
    throw new Error(`No TMDB matches for "${title}".`);
  }

  // Prefer the result whose normalized title matches the slug exactly.
  const slugify = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const exact = results.find((r) => slugify(r.title) === slug);
  const best = exact ?? results[0];

  const details = await fetchMovieDetails(best.tmdbId);
  return { ...details, letterboxdUrl: buildLetterboxdUrl(slug) };
}

// ---------- Normalizers ------------------------------------------------------------

function normalizeSearchResult(r) {
  return {
    tmdbId: r.id,
    title: r.title,
    year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    posterUrl: r.poster_path ? `${IMG}/w342${r.poster_path}` : null,
    overview: r.overview ?? '',
  };
}

function normalizeMovieDetails(d) {
  const director = (d.credits?.crew ?? []).find((c) => c.job === 'Director')?.name ?? null;
  return {
    tmdbId: d.id,
    title: d.title,
    year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
    posterUrl: d.poster_path ? `${IMG}/w500${d.poster_path}` : null,
    backdropUrl: d.backdrop_path ? `${IMG}/w1280${d.backdrop_path}` : null,
    director,
    overview: d.overview ?? '',
    runtime: d.runtime ?? null,
    genres: (d.genres ?? []).map((g) => g.name),
    letterboxdUrl: null,
  };
}
