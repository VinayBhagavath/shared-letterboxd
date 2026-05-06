import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Reject obvious placeholder values so we don't try to talk to a fake host.
const PLACEHOLDER_PATTERNS = [
  /your-project-ref/i,
  /replace-with/i,
  /your-anon/i,
  /your-supabase/i,
  /example\.com/i,
];
function looksLikePlaceholder(v) {
  if (!v) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
}

const url = looksLikePlaceholder(rawUrl) ? null : rawUrl;
const anonKey = looksLikePlaceholder(rawKey) ? null : rawKey;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[supabase] Missing or placeholder VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Edit .env with real values and restart `npm run dev`.',
  );
}

export const supabase = createClient(
  url ?? 'http://localhost.invalid',
  anonKey ?? 'public-anon-key',
  {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

/**
 * Translate a low-level supabase-js error into a user-readable message
 * with diagnostic hints. Always returns a non-null Error.
 */
export function explainSupabaseError(err, action = 'reach Supabase') {
  if (!err) return new Error(`Unknown error trying to ${action}.`);
  const msg = String(err.message ?? err);
  const lower = msg.toLowerCase();

  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return new Error(
      `Could not ${action} — the browser couldn't reach ${url ?? 'the Supabase URL'}.\n` +
        '• Double-check VITE_SUPABASE_URL in .env (typos in the project ref are the #1 cause).\n' +
        '• Make sure your Supabase project is active (Free projects pause after 7 days idle — restore it from the dashboard).\n' +
        '• Try opening the URL in a new tab — if it shows DNS / "site can\'t be reached", the URL is wrong.\n' +
        '• Some ad blockers / network firewalls block *.supabase.co — try disabling them or another network.',
    );
  }
  if (err.code === 'PGRST301' || lower.includes('jwt')) {
    return new Error(
      `Auth error from Supabase: ${msg}. Check that VITE_SUPABASE_ANON_KEY matches the publishable / anon key for this project.`,
    );
  }
  if (err.code === '42P01' || lower.includes('does not exist')) {
    return new Error(
      `Supabase says a table is missing: ${msg}. Did you run supabase/schema.sql in the SQL editor?`,
    );
  }
  if (err.code === '42501' || lower.includes('row level security') || lower.includes('rls')) {
    return new Error(
      `Supabase blocked the request via Row Level Security: ${msg}. Re-run supabase/schema.sql — it sets the public-read/write policies this app needs.`,
    );
  }
  return new Error(`${action} failed: ${msg}`);
}
