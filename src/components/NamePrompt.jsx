import { useState } from 'react';
import { Check, Film } from './Icons.jsx';
import Avatar from './Avatar.jsx';
import { DEFAULT_USER_COLOR, USER_COLORS } from '../lib/userColors.js';

export default function NamePrompt({
  open,
  initialName = '',
  initialColor = DEFAULT_USER_COLOR,
  onSubmit,
  onCancel,
  canCancel = false,
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  if (!open) return null;
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 32;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-prompt-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit({ name: trimmed, color });
        }}
        className="card w-full max-w-md p-7"
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-orange/15 text-accent-orange">
            <Film size={20} />
          </span>
          <div>
            <h2 id="name-prompt-title" className="font-display text-xl font-bold leading-tight">
              {initialName ? 'Edit your profile' : "What's your name?"}
            </h2>
            <p className="text-sm text-ink-300">
              Shown next to your suggestions, votes, and comments.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Avatar name={trimmed || '?'} color={color} size="lg" ring="ring-2 ring-ink-700" />
          <input
            autoFocus
            className="input flex-1"
            maxLength={32}
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Avatar color
          </legend>
          <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {USER_COLORS.map((c) => {
              const selected = c.value === color;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-label={c.label}
                  aria-pressed={selected}
                  title={c.label}
                  className={[
                    'relative h-9 w-9 rounded-full transition-transform',
                    selected ? 'scale-110 ring-2 ring-ink-100' : 'hover:scale-105 ring-1 ring-ink-700',
                  ].join(' ')}
                  style={{ backgroundColor: c.value }}
                >
                  {selected && (
                    <span className="absolute inset-0 grid place-items-center text-ink-950">
                      <Check size={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="mt-3 text-xs text-ink-400">
          Stored locally in your browser. No password, no email.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          {canCancel && (
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={!valid}>
            {initialName ? 'Save' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
