import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY ' +
      '(locally in .env.local, on Vercel in Project Settings > Environment Variables).',
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
