import { createClient } from '@supabase/supabase-js';

/**
 * Supabase connection details, deliberately committed rather than read from
 * the environment.
 *
 * The publishable key is designed to be exposed in a browser: every table has
 * row level security enabled with a SELECT-only policy for the anon role, so
 * this key can read the guide and nothing else. There is no write path.
 *
 * It gets inlined into the client bundle either way, so sourcing it from an
 * environment variable buys no security — it only adds a way for the whole app
 * to break on a mistyped or truncated paste in a hosting dashboard. Point this
 * at a different project by editing these two constants.
 */
const SUPABASE_URL = 'https://qebhahxvlopomvkbykeb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nyEJTsB1-TlPnruw0hM60g_b-e0C7yx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});

/**
 * The Mapbox token genuinely varies per deployment and is billed per account,
 * so it stays an environment variable. Trimmed because hosting dashboards
 * commonly keep trailing whitespace on paste.
 */
export const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();
