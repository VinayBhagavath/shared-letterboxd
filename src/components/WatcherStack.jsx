import Avatar from './Avatar.jsx';
import { resolveUserColor } from '../lib/userColors.js';

/**
 * Horizontally stacked, slightly-overlapping avatars of users who have
 * watched a movie. Shows up to `max` avatars, then a "+N" pill for overflow.
 * The current user (if they've seen it) is bumped to the front so their
 * own circle is always visible.
 */
export default function WatcherStack({ watches, currentUserName, max = 4, size = 'md' }) {
  if (!watches || watches.length === 0) return null;

  const lower = (currentUserName ?? '').trim().toLowerCase();
  const ordered = lower
    ? [...watches].sort((a, b) => {
        const aMine = (a.user_name ?? '').toLowerCase() === lower;
        const bMine = (b.user_name ?? '').toLowerCase() === lower;
        if (aMine !== bMine) return aMine ? -1 : 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      })
    : watches;

  const visible = ordered.slice(0, max);
  const overflow = ordered.length - visible.length;
  const sizeClasses = OVERFLOW_SIZES[size] ?? OVERFLOW_SIZES.md;

  return (
    <div
      className="flex -space-x-2"
      aria-label={`${watches.length} ${watches.length === 1 ? 'person has' : 'people have'} watched this`}
      title={ordered.map((w) => w.user_name).join(', ')}
    >
      {visible.map((w) => (
        <Avatar
          key={w.id}
          name={w.user_name}
          color={resolveUserColor(w.user_color, w.user_name)}
          size={size}
          ring="ring-2 ring-ink-950 shadow-md"
        />
      ))}
      {overflow > 0 && (
        <span
          className={[
            'inline-flex items-center justify-center rounded-full font-semibold',
            'bg-ink-800 text-ink-100 ring-2 ring-ink-950 shadow-md',
            sizeClasses,
          ].join(' ')}
          title={ordered
            .slice(max)
            .map((w) => w.user_name)
            .join(', ')}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

const OVERFLOW_SIZES = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};
