import { useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { formatRelative } from '../lib/format.js';
import { resolveUserColor } from '../lib/userColors.js';

/**
 * Floating list of users (voters, watchers, commenters, …).
 * Pass `entries`: an array of objects with { id, user_name, user_color, created_at }.
 *
 * Anchors absolutely above its parent; the parent should be `position: relative`
 * and have its own click handler to toggle `open`. Closing on outside-click and
 * Escape is handled here.
 */
export default function UserListPopover({
  open,
  onClose,
  title,
  entries,
  emptyText = 'Nobody yet.',
  align = 'left',
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) onClose?.();
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sorted = [...(entries ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={title ?? 'User list'}
      className={[
        'absolute bottom-full mb-2 z-30 w-56 max-w-[80vw]',
        'card p-3 animate-fade-in shadow-poster',
        align === 'right' ? 'right-0' : 'left-0',
      ].join(' ')}
      onClick={(e) => e.stopPropagation()}
    >
      {title && (
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-2">
          {title}
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="text-sm text-ink-300">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5 max-h-56 overflow-y-auto">
          {sorted.map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <Avatar
                name={e.user_name}
                color={resolveUserColor(e.user_color, e.user_name)}
                size="sm"
              />
              <span className="text-sm text-ink-100 truncate flex-1">{e.user_name}</span>
              {e.created_at && (
                <span className="text-[10px] text-ink-400 whitespace-nowrap">
                  {formatRelative(e.created_at)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
