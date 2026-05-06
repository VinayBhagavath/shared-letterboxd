// Curated palette of avatar colors. All chosen to read well against the
// dark UI and to be visually distinct from each other on a poster.
export const USER_COLORS = [
  { id: 'orange', value: '#ff8000', label: 'Orange' },
  { id: 'green',  value: '#00e054', label: 'Green' },
  { id: 'blue',   value: '#40bcf4', label: 'Blue' },
  { id: 'pink',   value: '#f472b6', label: 'Pink' },
  { id: 'purple', value: '#a78bfa', label: 'Purple' },
  { id: 'yellow', value: '#fbbf24', label: 'Yellow' },
  { id: 'red',    value: '#f87171', label: 'Red' },
  { id: 'teal',   value: '#2dd4bf', label: 'Teal' },
  { id: 'lime',   value: '#a3e635', label: 'Lime' },
  { id: 'rose',   value: '#fb7185', label: 'Rose' },
];

const VALUES = USER_COLORS.map((c) => c.value);
const VALID = new Set(VALUES);

export const DEFAULT_USER_COLOR = USER_COLORS[0].value;

/**
 * Stable color from a display name. Used as a fallback for movies/comments
 * that were created before the color column existed (or by users on older
 * clients). Same name → same color, every time.
 */
export function colorFromName(name) {
  if (!name) return DEFAULT_USER_COLOR;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % VALUES.length;
  return VALUES[idx];
}

/**
 * Resolve the avatar color for a row: prefer the explicitly stored color,
 * else fall back to a deterministic hash of the user name.
 */
export function resolveUserColor(stored, name) {
  if (stored && VALID.has(stored)) return stored;
  return colorFromName(name);
}
