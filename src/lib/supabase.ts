import { createClient } from '@supabase/supabase-js';

/**
 * Supabase connection details, deliberately committed rather than read from
 * the environment.
 *
 * This key is designed to be exposed in a browser. It carries the `anon` role,
 * and every table is guarded by row level security: the guide is readable only
 * by an authenticated user with an active subscription, and nothing is
 * client-writable. Publishing it grants no more than visiting the site does.
 *
 * Vite inlines the value into the client bundle either way, so sourcing it from
 * an environment variable buys no security — it only adds a way for the whole
 * app to break on a mistyped paste in a hosting dashboard.
 *
 * The legacy JWT-format anon key is used in preference to the newer
 * `sb_publishable_...` key purely for compatibility: every version of
 * supabase-js and every gateway configuration accepts this format. Both are
 * enabled on the project and either would work.
 *
 * Point this at a different project by editing these two constants.
 */
const SUPABASE_URL = 'https://qebhahxvlopomvkbykeb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlYmhhaHh2bG9wb212a2J5a2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTQwNzYsImV4cCI6MjEwMTYzMDA3Nn0' +
  '.7v3y4puNQbEqDUgAkyWi5qQig_XjnJ5pgkks41vtOW8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Magic links come back as a URL fragment that has to be consumed on load.
    detectSessionInUrl: true,
  },
});

/**
 * The Mapbox token genuinely varies per deployment and is billed per account,
 * so it stays an environment variable. Trimmed because hosting dashboards
 * commonly keep trailing whitespace on paste.
 */
export const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();
