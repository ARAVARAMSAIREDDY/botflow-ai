import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT, 10) || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  API_BASE_URL: process.env.API_BASE_URL || '',
  WIDGET_PUBLIC_URL: process.env.WIDGET_PUBLIC_URL || '',

  // Trusted reverse proxy (e.g. Render, Railway, AWS ALB, Cloudflare)
  TRUST_PROXY: process.env.TRUST_PROXY ? (process.env.TRUST_PROXY === 'true' ? 1 : parseInt(process.env.TRUST_PROXY, 10) || 1) : 1,

  // Allowed CORS origins for authenticated API routes
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
  OPENAI_MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 800,

  // RAG & Embeddings
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE, 10) || 800,
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP, 10) || 150,
  SIMILARITY_MATCH_THRESHOLD: parseFloat(process.env.SIMILARITY_MATCH_THRESHOLD) || 0.35,
  SIMILARITY_TOP_K: parseInt(process.env.SIMILARITY_TOP_K, 10) || 4,
  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 15,

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

  // Rate Limiter
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

  // JWT & Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'botflow-super-secret-jwt-key-2026-production-safe',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Razorpay Payment Gateway
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'botflow_webhook_secret_local'
};

export const isSupabaseConfigured = () => {
  return Boolean(
    env.SUPABASE_URL && 
    (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY) &&
    env.SUPABASE_URL.startsWith('https://')
  );
};

export const isOpenAIConfigured = () => {
  return Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 10);
};

export const isRazorpayConfigured = () => {
  return Boolean(
    env.RAZORPAY_KEY_ID && 
    env.RAZORPAY_KEY_SECRET &&
    env.RAZORPAY_KEY_ID.startsWith('rzp_')
  );
};
