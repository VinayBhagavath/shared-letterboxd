import { useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import NamePrompt from './components/NamePrompt.jsx';
import AddMovie from './components/AddMovie.jsx';
import MovieCard from './components/MovieCard.jsx';
import EmptyState from './components/EmptyState.jsx';
import { useLocalStorage } from './lib/useLocalStorage.js';
import { useWatchlist } from './lib/useWatchlist.js';
import { isSupabaseConfigured } from './lib/supabase.js';
import { DEFAULT_USER_COLOR } from './lib/userColors.js';

export default function App() {
  const [userName, setUserName] = useLocalStorage('shared-watchlist:user-name', '');
  const [userColor, setUserColor] = useLocalStorage(
    'shared-watchlist:user-color',
    DEFAULT_USER_COLOR,
  );
  const [editingName, setEditingName] = useState(false);

  const {
    movies,
    loading,
    error,
    addMovie,
    toggleVote,
    toggleSeen,
    addComment,
    deleteMovie,
  } = useWatchlist(userName, userColor);

  const existingTmdbIds = useMemo(
    () => new Set(movies.map((m) => m.tmdb_id)),
    [movies],
  );

  // Single unified list, ranked by votes, then most recently added.
  const sortedMovies = useMemo(() => {
    return [...movies].sort((a, b) => {
      if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
      return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
    });
  }, [movies]);

  const namePromptOpen = !userName || editingName;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        userName={userName}
        userColor={userColor}
        onEditName={() => setEditingName(true)}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {!isSupabaseConfigured && (
          <ConfigBanner
            title="Supabase not configured"
            body={
              <>
                Add <code className="text-amber-200">VITE_SUPABASE_URL</code> and{' '}
                <code className="text-amber-200">VITE_SUPABASE_ANON_KEY</code> to your{' '}
                <code className="text-amber-200">.env</code> and restart the dev server.
              </>
            }
          />
        )}

        <AddMovie onAdd={addMovie} existingTmdbIds={existingTmdbIds} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display text-lg font-bold tracking-tight">
            The Watchlist{' '}
            <span className="text-ink-400 font-normal text-sm">
              · {sortedMovies.length} {sortedMovies.length === 1 ? 'movie' : 'movies'}
            </span>
          </h2>
          {userName && (
            <p className="text-sm text-ink-400">
              Signed in as <span className="text-ink-200">{userName}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="card p-4 border-red-500/40 text-red-200 text-sm">
            <div className="font-semibold mb-1">Couldn't load the watchlist</div>
            <pre className="whitespace-pre-wrap font-sans text-red-200/90">
              {error.message ?? String(error)}
            </pre>
          </div>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : sortedMovies.length === 0 ? (
          <EmptyState
            title="Your watchlist is empty"
            body="Paste a Letterboxd link or search a title above to add the first film."
            hint={
              !userName ? 'Tip: pick a display name so your votes and comments are credited.' : null
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {sortedMovies.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                userName={userName}
                onToggleVote={toggleVote}
                onToggleSeen={toggleSeen}
                onAddComment={addComment}
                onDelete={deleteMovie}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-ink-800/70 py-6 mt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-xs text-ink-400 flex flex-wrap items-center gap-x-4 gap-y-1 justify-between">
          <span>
            Movie data from{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer noopener"
              className="text-ink-200 hover:text-accent-blue"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </span>
          <span>Built with React + Supabase.</span>
        </div>
      </footer>

      <NamePrompt
        open={namePromptOpen}
        initialName={userName}
        initialColor={userColor}
        canCancel={Boolean(userName)}
        onCancel={() => setEditingName(false)}
        onSubmit={({ name, color }) => {
          setUserName(name);
          setUserColor(color);
          setEditingName(false);
        }}
      />
    </div>
  );
}

function ConfigBanner({ title, body }) {
  return (
    <div className="card border-amber-500/40 p-4 text-sm">
      <div className="font-semibold text-amber-200">{title}</div>
      <div className="mt-1 text-ink-200">{body}</div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="aspect-[2/3] skeleton" />
          <div className="p-3.5 space-y-2">
            <div className="h-3.5 w-3/4 skeleton rounded" />
            <div className="h-3 w-1/2 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
