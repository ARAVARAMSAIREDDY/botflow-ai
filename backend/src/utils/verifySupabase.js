import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

console.log('Testing Supabase Connection...');
console.log('Target URL:', supabaseUrl);

const key = serviceRoleKey || anonKey;
if (!supabaseUrl || !key) {
  console.error('\n❌ Missing API Key: Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('chatbots').select('count', { count: 'exact', head: true });
    if (error) {
      console.warn('Connected to Supabase endpoint, but table query returned:', error.message);
      console.log('ℹ️ Tip: Remember to run backend/migrations/000_master_production_schema.sql in your Supabase SQL Editor.');
    } else {
      console.log('✅ Supabase connected successfully and tables are ready!');
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testConnection();
