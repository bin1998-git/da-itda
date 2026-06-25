import { createClient } from '@supabase/supabase-js';

// Module-level singleton — shared within the same server process (anon key, no user state)
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function supabaseServer() {
  return client;
}
