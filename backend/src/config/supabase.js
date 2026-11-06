import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env.js';
import { logger } from '../utils/logger.js';

let supabaseClient = null;

if (isSupabaseConfigured()) {
  try {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    supabaseClient = createClient(env.SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    logger.success(`Supabase client initialized successfully for ${env.SUPABASE_URL}`);
  } catch (err) {
    logger.error('Failed to initialize Supabase client:', err.message);
  }
} else {
  logger.warn('Supabase credentials not configured in backend/.env. Using in-memory fallback store for immediate local development.');
}

export const getSupabaseClient = () => supabaseClient;
export { supabaseClient };
