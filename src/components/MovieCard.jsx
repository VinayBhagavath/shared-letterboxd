import { useEffect, useState } from 'react';
import { ArrowUp, Check, Eye, ExternalLink, MessageCircle, Trash } from './Icons.jsx';
import Avatar from './Avatar.jsx';
import WatcherStack from './WatcherStack.jsx';
import UserListPopover from './UserListPopover.jsx';
import { formatRelative, formatRuntime } from '../lib/format.js';
import { resolveUserColor } from '../lib/userColors.js';

export default function MovieCard({
  movie,
  userName,
  onToggleVote,
  onToggleSeen,
  onAddComment,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(() => (movie.comment_count ?? 0) > 0);
  const [userToggledComments, setUserToggledComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [voteAnim, setVoteAnim] = useState(false);
  const [seenAnim, setSeenAnim] = useState(false);
  const [showVoters, setShowVoters] = useState(false);

  const canDelete = userName && movie.added_by?.toLowerCase() === userName.toLowerCase();
  const addedColor = resolveUserColor(movie.added_by_color, movie.added_by);

  useEffect(() => {
    if (userToggledComments) return;
    setExpanded((movie.comment_count ?? 0) > 0);
  }, [movie.comment_count, userToggledComments]);

  async function handleVote() {
    if (!userName) return;
    setBusy(true);
    setVoteAnim(true);
    try {
      await onToggleVote(movie.id);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
      setTimeout(() => setVoteAnim(false), 320);
    }
  }

  async function handleSeen() {
    if (!userName) return;
    setBusy(true);
    setSeenAnim(true);
    try {
      await onToggleSeen(movie.id);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
      setTimeout(() => setSeenAnim(false), 320);
    }
  }

  async function handleSubmitComment(e) {
    e.preventDefault();
    if (!commentDraft.trim()) return;
    setBusy(true);
    try {
      await onAddComment(movie.id, commentDraft);
      setCommentDraft('');
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card group relative flex flex-col overflow-hidden transition-all hover:border-ink-600">
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-ink-800 overflow-hidden">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-ink-500 text-sm">
            No poster
          </div>
        )}

        {/* Top-left: stacked avatars of everyone who has watched this */}
        {movie.watcher_count > 0 && (
          <div className={['absolute top-2 left-2', seenAnim ? 'animate-pop' : ''].join(' ')}>
            <WatcherStack
              watches={movie.watches}
              currentUserName={userName}
              max={4}
              size="md"
            />
          </div>
        )}

        {/* Top-right: Letterboxd link badge (kept) */}
        {movie.letterboxd_url && (
          <div className="absolute top-2 right-2">
            <a
              href={movie.letterboxd_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 rounded-full bg-ink-950/80 backdrop-blur text-ink-100 text-[11px] font-medium px-2 py-0.5 border border-ink-700 hover:bg-ink-900"
              title="Open on Letterboxd"
            >
              LB <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* Vote pill — click to see who voted */}
        <div className="absolute bottom-2 left-2">
          <button
            type="button"
            onClick={() => setShowVoters((v) => !v)}
            className={[
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold border backdrop-blur transition-colors',
              movie.has_voted
                ? 'bg-accent-orange/95 text-ink-950 border-accent-orange hover:bg-accent-orange'
                : 'bg-ink-950/80 text-ink-100 border-ink-700 hover:bg-ink-900',
              voteAnim ? 'animate-pop' : '',
            ].join(' ')}
            aria-haspopup="dialog"
            aria-expanded={showVoters}
            aria-label={
              movie.vote_count === 0
                ? 'No votes yet'
                : `${movie.vote_count} ${movie.vote_count === 1 ? 'vote' : 'votes'} — click to see who voted`
            }
            title={
              movie.vote_count === 0
                ? 'No votes yet'
                : `Click to see who voted (${movie.vote_count})`
            }
          >
            <ArrowUp size={14} />
            {movie.vote_count}
          </button>
          <UserListPopover
            open={showVoters}
            onClose={() => setShowVoters(false)}
            title={`Voted (${movie.vote_count})`}
            entries={movie.votes}
            emptyText="No votes yet — be the first."
            align="left"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="font-display font-bold text-base leading-tight">
          {movie.title}{' '}
          <span className="text-ink-300 font-normal">{movie.year ?? ''}</span>
        </h3>
        <div className="mt-1 text-xs text-ink-300 flex flex-wrap gap-x-2 gap-y-0.5">
          {movie.director && <span>Dir. {movie.director}</span>}
          {movie.runtime ? <span>· {formatRuntime(movie.runtime)}</span> : null}
        </div>

        {movie.genres?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {movie.genres.slice(0, 3).map((g) => (
              <span key={g} className="chip">{g}</span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-ink-400">
          <span
            className="inline-flex items-center gap-1.5"
            title={`Added ${formatRelative(movie.added_at)}`}
          >
            <Avatar name={movie.added_by} color={addedColor} size="xs" />
            <span>
              suggested by <span className="text-ink-200">{movie.added_by}</span>
            </span>
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-ink-100"
            onClick={() => {
              setUserToggledComments(true);
              setExpanded((v) => !v);
            }}
            aria-expanded={expanded}
          >
            <MessageCircle size={14} /> {expanded ? 'Hide' : 'Show'} {movie.comment_count}
          </button>
        </div>

        {/* Action row */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={[
              'btn text-sm py-1.5 border',
              movie.has_voted
                ? 'bg-accent-orange/15 text-accent-orange border-accent-orange/40 hover:bg-accent-orange/25'
                : 'bg-ink-800 text-ink-100 border-ink-700 hover:bg-ink-700',
            ].join(' ')}
            disabled={busy || !userName}
            onClick={handleVote}
          >
            <ArrowUp size={14} />
            {movie.has_voted ? 'Voted' : 'Vote'}
          </button>
          <button
            type="button"
            className={[
              'btn text-sm py-1.5 border',
              movie.has_seen
                ? 'bg-accent-green/15 text-accent-green border-accent-green/40 hover:bg-accent-green/25'
                : 'bg-ink-800 text-ink-100 border-ink-700 hover:bg-ink-700',
              seenAnim ? 'animate-pop' : '',
            ].join(' ')}
            disabled={busy || !userName}
            onClick={handleSeen}
            title={
              !userName
                ? 'Set a name to mark as seen'
                : movie.has_seen
                ? 'Unmark as seen'
                : 'Mark as seen'
            }
          >
            {movie.has_seen ? <Check size={14} /> : <Eye size={14} />}
            {movie.has_seen ? 'Seen' : 'Mark seen'}
          </button>
        </div>

        {canDelete && (
          <button
            type="button"
            className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs text-ink-400 hover:text-red-300 transition"
            onClick={() => {
              if (window.confirm(`Remove "${movie.title}" from the watchlist?`)) onDelete(movie.id);
            }}
          >
            <Trash size={12} /> Remove
          </button>
        )}
      </div>

      {/* Comments thread */}
      {expanded && (
        <div className="border-t border-ink-700/70 bg-ink-900/60 p-3.5 animate-fade-in">
          {movie.comments.length === 0 ? (
            <p className="text-xs text-ink-400">No comments yet. Start the thread.</p>
          ) : (
            <ul className="space-y-2.5">
              {movie.comments.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <Avatar
                    name={c.user_name}
                    color={resolveUserColor(c.user_color, c.user_name)}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-ink-300">
                      <span className="text-ink-100 font-medium">{c.user_name}</span>{' '}
                      <span className="text-ink-400">· {formatRelative(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-ink-100 whitespace-pre-wrap break-words">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmitComment} className="mt-3 flex gap-2">
            <input
              className="input py-2 text-sm"
              placeholder={userName ? 'Add a comment…' : 'Set a name to comment'}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              disabled={!userName || busy}
              maxLength={500}
            />
            <button
              type="submit"
              className="btn-primary text-sm py-2 px-3"
              disabled={!userName || busy || !commentDraft.trim()}
            >
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
