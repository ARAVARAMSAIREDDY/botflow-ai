import { Router } from 'express';
import authRoutes from './authRoutes.js';
import billingRoutes from './billingRoutes.js';
import publicRoutes from './publicRoutes.js';
import chatRoutes from './chatRoutes.js';
import chatbotRoutes from './chatbotRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import knowledgeRoutes from './knowledgeRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import exportRoutes from './exportRoutes.js';
import { env, isOpenAIConfigured, isSupabaseConfigured, isRazorpayConfigured } from '../config/env.js';
import { getSupabaseClient } from '../config/supabase.js';

const router = Router();

// Liveness check endpoint (Kubernetes / Render liveness probe)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BotFlow AI Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    integrations: {
      openai: {
        configured: isOpenAIConfigured(),
        model: env.OPENAI_MODEL,
        embeddingModel: env.OPENAI_EMBEDDING_MODEL
      },
      supabase: {
        configured: isSupabaseConfigured()
      },
      razorpay: {
        configured: isRazorpayConfigured()
      }
    }
  });
});

// Readiness check endpoint (Kubernetes / Render readiness probe)
router.get('/ready', async (req, res) => {
  if (process.__isShuttingDown) {
    return res.status(503).json({
      status: 'draining',
      message: 'Server is currently draining connections for shutdown'
    });
  }

  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  if (isSupabaseConfigured()) {
    try {
      const start = Date.now();
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('chatbots').select('id', { head: true, count: 'exact' });
      dbLatencyMs = Date.now() - start;
      if (error && error.code !== 'PGRST116') {
        dbStatus = 'degraded';
      }
    } catch (e) {
      dbStatus = 'unavailable';
    }
  }

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const isHealthy = dbStatus !== 'unavailable';

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ready' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      type: isSupabaseConfigured() ? 'supabase-postgresql' : 'local-in-memory'
    },
    system: {
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      rssMb: Math.round(memory.rss / 1024 / 1024),
      nodeVersion: process.version
    }
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/billing', billingRoutes);
router.use('/public', publicRoutes);
router.use('/chat', chatRoutes);
router.use('/chatbots', chatbotRoutes);
router.use('/conversations', conversationRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/export', exportRoutes);

export default router;
