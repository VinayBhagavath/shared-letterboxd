import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchMovieDetails,
  isTmdbConfigured,
  parseLetterboxdSlug,
  resolveFromLetterboxdSlug,
  searchMovies,
} from '../lib/tmdb.js';
import { formatRuntime } from '../lib/format.js';
import { Plus, Search, X } from './Icons.jsx';

export default function AddMovie({ onAdd, existingTmdbIds }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const [draft, setDraft] = useState(null); // resolved movie details awaiting confirmation
  const [draftLoading, setDraftLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const looksLikeLetterboxd = useMemo(() => Boolean(parseLetterboxdSlug(query)), [query]);

  // Debounced live search for plain titles.
  useEffect(() => {
    if (!isTmdbConfigured) return;
    const trimmed = query.trim();
    if (!trimmed || looksLikeLetterboxd) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const { results: r } = await searchMovies(trimmed);
        setResults(r.slice(0, 8));
      } catch (e) {
        setError(e.message);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, looksLikeLetterboxd]);

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (!wrapRef.current?.contains(e.target)) setShowDropdown(false);
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  function reset() {
    setQuery('');
    setResults([]);
    setDraft(null);
    setError(null);
    setShowDropdown(false);
  }

  async function handleResolveLetterboxd() {
    setError(null);
    const slug = parseLetterboxdSlug(query);
    if (!slug) return;
    setDraftLoading(true);
    try {
      const details = await resolveFromLetterboxdSlug(slug);
      setDraft(details);
      setShowDropdown(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handlePickResult(r) {
    setError(null);
    setShowDropdown(false);
    setDraftLoading(true);
    try {
      const details = await fetchMovieDetails(r.tmdbId);
      setDraft(details);
    } catch (e) {
      setError(e.message);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleConfirm() {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(draft);
      reset();
    } catch (e) {
      setError(e.message ?? 'Could not save that movie.');
    } finally {
      setSubmitting(false);
    }
  }

  const alreadyAdded = draft && existingTmdbIds.has(draft.tmdbId);

  return (
    <section ref={wrapRef} className="relative">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              className="input pl-10"
              placeholder="Paste a Letterboxd URL or search by title..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
                setError(null);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (looksLikeLetterboxd) handleResolveLetterboxd();
                  else if (results[0]) handlePickResult(results[0]);
                } else if (e.key === 'Escape') {
                  setShowDropdown(false);
                }
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ink-400 hover:text-ink-100"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  inputRef.current?.focus();
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn-primary whitespace-nowrap"
            disabled={
              draftLoading ||
              (!looksLikeLetterboxd && !results[0]) ||
              !isTmdbConfigured
            }
            onClick={() => {
              if (looksLikeLetterboxd) handleResolveLetterboxd();
              else if (results[0]) handlePickResult(results[0]);
            }}
          >
            <Plus size={16} />
            {draftLoading ? 'Loading…' : 'Add'}
          </button>
        </div>

        {!isTmdbConfigured && (
          <p className="mt-3 text-sm text-amber-300">
            TMDB API key missing. Add <code className="text-amber-200">VITE_TMDB_API_KEY</code> to
            your <code className="text-amber-200">.env</code> to enable search.
          </p>
        )}
        {error && (
          <pre className="mt-3 whitespace-pre-wrap text-sm text-red-300 font-sans">
            {error}
          </pre>
        )}
        {looksLikeLetterboxd && (
          <p className="mt-3 text-xs text-ink-400">
            Detected a Letterboxd link. Press <kbd className="chip">Enter</kbd> or click Add to
            resolve via TMDB.
          </p>
        )}
      </div>

      {/* Search results dropdown */}
      {showDropdown && !looksLikeLetterboxd && query.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 card overflow-hidden animate-fade-in">
          {searching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-ink-300">Searching TMDB…</div>
          )}
          {!searching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-ink-300">No matches.</div>
          )}
          <ul className="max-h-96 overflow-y-auto">
            {results.map((r) => (
              <li key={r.tmdbId}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-ink-800 transition"
                  onClick={() => handlePickResult(r)}
                >
                  <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-ink-700">
                    {r.posterUrl ? (
                      <img src={r.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="text-xs text-ink-400">
                      {r.year ?? '—'}
                      {existingTmdbIds.has(r.tmdbId) ? ' · already in list' : ''}
                    </div>
                    {r.overview && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-ink-300">{r.overview}</div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmation card for resolved draft */}
      {draft && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="card w-full max-w-2xl overflow-hidden">
            {draft.backdropUrl && (
              <div
                className="h-32 sm:h-40 bg-cover bg-center"
                style={{ backgroundImage: `url(${draft.backdropUrl})` }}
                aria-hidden="true"
              >
                <div className="h-full w-full bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
              </div>
            )}
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
              <div className="flex-shrink-0 w-32 sm:w-36 mx-auto sm:mx-0 -mt-16 sm:-mt-20">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ink-800 shadow-poster">
                  {draft.posterUrl ? (
                    <img src={draft.posterUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-ink-500 text-xs">
                      No poster
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-xl font-bold leading-tight">
                  {draft.title}{' '}
                  <span className="text-ink-300 font-normal">{draft.year ?? ''}</span>
                </h3>
                <div className="mt-1 text-sm text-ink-300 flex flex-wrap gap-x-3 gap-y-1">
                  {draft.director && <span>Dir. {draft.director}</span>}
                  {draft.runtime ? <span>· {formatRuntime(draft.runtime)}</span> : null}
                </div>
                {draft.genres?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {draft.genres.map((g) => (
                      <span key={g} className="chip">{g}</span>
                    ))}
                  </div>
                )}
                {draft.overview && (
                  <p className="mt-3 text-sm text-ink-200 line-clamp-4">{draft.overview}</p>
                )}
                {alreadyAdded && (
                  <p className="mt-3 text-sm text-amber-300">
                    Already on the watchlist — adding will keep the existing entry.
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={submitting}
                    onClick={handleConfirm}
                  >
                    {submitting ? 'Adding…' : alreadyAdded ? 'Update' : 'Add to watchlist'}
                  </button>
                </div>
                {error && (
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-red-300 font-sans">
                    {error}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
