import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
console.log('[supabase] URL:', supabaseUrl?.slice(0, 40));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
