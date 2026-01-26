
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Use createBrowserClient instead of createClient to enable Cookie storage for Server Actions
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
