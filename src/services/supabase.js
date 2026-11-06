import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseClientConfigured = () => {
  return Boolean(
    supabaseUrl && 
    supabaseUrl.startsWith('http') && 
    supabaseAnonKey && 
    supabaseAnonKey.length > 20
  );
};

export const supabase = isSupabaseClientConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
