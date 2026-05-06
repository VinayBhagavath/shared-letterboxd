import { Edit, Film } from './Icons.jsx';
import Avatar from './Avatar.jsx';
import { DEFAULT_USER_COLOR } from '../lib/userColors.js';

export default function Header({ userName, userColor, onEditName }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-800/70 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-orange via-accent-green to-accent-blue text-ink-950">
            <Film size={18} />
          </span>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-lg tracking-tight">
              Shared Watchlist
            </div>
            <div className="text-[11px] text-ink-400 hidden sm:block">
              vote · comment · watch together
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditName}
          className="inline-flex items-center gap-2 rounded-full bg-ink-900 border border-ink-700 px-2 py-1 hover:bg-ink-800 transition"
          title="Change your display name and color"
        >
          <Avatar
            name={userName || '?'}
            color={userColor || DEFAULT_USER_COLOR}
            size="md"
            ring="ring-1 ring-ink-600"
          />
          <span className="text-sm text-ink-100 max-w-[10rem] truncate pl-1">
            {userName || 'Set name'}
          </span>
          <Edit size={13} className="text-ink-400 mr-1" />
        </button>
      </div>
    </header>
  );
}
