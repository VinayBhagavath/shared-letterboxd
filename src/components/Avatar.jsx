import { firstInitial, initialsFromName } from '../lib/format.js';

/**
 * Colored avatar circle.
 *
 * Props:
 *   name        - display name (used for the letter and a11y label)
 *   color       - hex string, e.g. "#ff8000". Required for visual identity.
 *   size        - 'xs' | 'sm' | 'md' | 'lg'  (default 'sm')
 *   single      - true → first initial only, false → up to 2 letters
 *   ring        - tailwind ring/border classes for contrast on busy backgrounds
 *   title       - tooltip override (defaults to the name)
 *   className   - extra classes
 */
export default function Avatar({
  name,
  color,
  size = 'sm',
  single = true,
  ring = 'ring-1 ring-ink-950/40',
  title,
  className = '',
}) {
  const dims = SIZES[size] ?? SIZES.sm;
  const text = single ? firstInitial(name) : initialsFromName(name);
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full font-bold text-ink-950 select-none',
        dims,
        ring,
        className,
      ].join(' ')}
      style={{ backgroundColor: color }}
      title={title ?? name ?? ''}
      aria-label={name ? `${name}'s avatar` : 'avatar'}
    >
      {text}
    </span>
  );
}

const SIZES = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};
