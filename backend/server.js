import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, isOpenAIConfigured, isSupabaseConfigured } from './src/config/env.js';
import { logger } from './src/utils/logger.js';
import { apiLimiter } from './src/middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import apiRoutes from './src/routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (for Render, Railway, Cloudflare, AWS ALB)
app.set('trust proxy', env.TRUST_PROXY || 1);

// Security headers (configured to allow cross-origin widget embedding)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// Cross-Origin Resource Sharing
const allowedOrigins = [
  env.CLIENT_URL,
  ...(env.ALLOWED_ORIGINS || []),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow non-browser requests (curl, server-to-server, webhooks)
    if (!origin) return callback(null, true);
    // 2. Allow if origin matches client URL, allowed production origins, or dev/test
    if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      return callback(null, true);
    }
    // 3. Allow any origin for public widget APIs and script delivery
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Chatbot-ID']
}));

// Serve standalone embeddable widget SDK
app.use('/widget', express.static(path.join(__dirname, 'public/widget')));

// Serve standalone test site for verifying widget embedding
app.use('/test-site', express.static(path.join(__dirname, '../test-site')));

// Request body parsers with payload limits and raw body buffer capture for payment webhooks
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// Global API rate limiter
app.use('/api', apiLimiter);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'BotFlow AI API is running',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// API Routes
app.use('/api', apiRoutes);

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server only when executed directly (node server.js), not when imported by tests
let server = null;
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server')
);

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  server = app.listen(env.PORT, () => {
    logger.success(`====================================================`);
    logger.success(`🚀 BotFlow AI Backend running on http://localhost:${env.PORT}`);
    logger.info(`   Node Environment: ${env.NODE_ENV}`);
    logger.info(`   OpenAI API:       ${isOpenAIConfigured() ? `Active (${env.OPENAI_MODEL})` : 'Sandbox / Mock Mode'}`);
    logger.info(`   Supabase DB:      ${isSupabaseConfigured() ? 'Connected' : 'In-Memory Fallback'}`);
    logger.info(`   Health Endpoint:  http://localhost:${env.PORT}/api/health`);
    logger.success(`====================================================`);
  });

  let isShuttingDown = false;
  process.__isShuttingDown = false;

  const handleShutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    process.__isShuttingDown = true;
    logger.info(`Received ${signal || 'shutdown signal'}. Gracefully shutting down BotFlow AI server...`);

    // 10 second timeout for draining active HTTP connections
    const forceExitTimer = setTimeout(() => {
      logger.warn('Forcefully terminating active connections after timeout.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    if (server) {
      server.close(() => {
        clearTimeout(forceExitTimer);
        logger.info('HTTP server closed cleanly. Drained all active connections.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;
export { server };
