import jwt from 'jsonwebtoken';
import { getSupabaseClient } from '../config/supabase.js';
import { isSupabaseConfigured, env } from '../config/env.js';
import { authService } from '../services/authService.js';
import { chatbotService } from '../services/chatbotService.js';
import { knowledgeService } from '../services/knowledgeService.js';
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware: Optional authentication (attaches user if valid token present, allows through if not)
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          plan_tier: user.user_metadata?.plan_tier || 'free'
        };
      }
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        plan_tier: decoded.plan_tier || 'free'
      };
    } catch {
      req.user = null;
    }
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

/**
 * Middleware: Requires a valid Supabase JWT or local JWT bearer token
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication required. Missing or malformed Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return errorResponse(res, 'Invalid or expired authentication token.', 401);
      }

      req.user = {
        id: user.id,
        email: user.email,
        plan_tier: user.user_metadata?.plan_tier || 'free'
      };
      return next();
    }

    // Local JWT verification
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        plan_tier: decoded.plan_tier || 'free'
      };
      return next();
    } catch (jwtErr) {
      return errorResponse(res, 'Invalid or expired authentication token.', 401);
    }
  } catch (err) {
    logger.error('requireAuth middleware error:', err.message);
    return errorResponse(res, 'Authentication verification failed.', 401);
  }
}

/**
 * Middleware: Enforces that the target chatbot belongs to the authenticated user (Tenant Isolation)
 */
export async function requireChatbotOwnership(req, res, next) {
  if (!req.user || !req.user.id) {
    return errorResponse(res, 'Authentication required to verify resource ownership.', 401);
  }

  const chatbotId = req.params.chatbotId || req.params.id || req.body.chatbotId;

  if (!chatbotId) {
    return errorResponse(res, 'Chatbot ID is required for authorization check.', 400);
  }

  try {
    const chatbot = await chatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      return errorResponse(res, `Chatbot with ID "${chatbotId}" was not found.`, 404);
    }

    // STRICT MULTI-TENANT VERIFICATION:
    // If chatbot has a user_id and it doesn't match req.user.id, deny access!
    if (chatbot.user_id && chatbot.user_id !== req.user.id) {
      logger.warn(`Tenant access violation attempt: User "${req.user.id}" tried to access Bot "${chatbotId}" owned by "${chatbot.user_id}"`);
      return errorResponse(res, 'Access forbidden: You do not own this chatbot.', 403);
    }

    req.targetChatbot = chatbot;
    next();
  } catch (err) {
    logger.error('requireChatbotOwnership error:', err.message);
    return errorResponse(res, 'Failed to verify chatbot ownership.', 500);
  }
}

/**
 * Middleware: Enforces that the target knowledge source belongs to a chatbot owned by the user
 */
export async function requireSourceOwnership(req, res, next) {
  if (!req.user || !req.user.id) {
    return errorResponse(res, 'Authentication required.', 401);
  }

  const sourceId = req.params.sourceId;
  if (!sourceId) {
    return errorResponse(res, 'Source ID is required.', 400);
  }

  try {
    const source = await knowledgeService.getSourceById(sourceId);
    if (!source) {
      return errorResponse(res, `Knowledge source with ID "${sourceId}" not found.`, 404);
    }

    // Verify parent chatbot ownership
    const parentBot = await chatbotService.getChatbotById(source.chatbot_id);
    if (parentBot && parentBot.user_id && parentBot.user_id !== req.user.id) {
      logger.warn(`Tenant access violation: User "${req.user.id}" tried to access source "${sourceId}" on bot owned by "${parentBot.user_id}"`);
      return errorResponse(res, 'Access forbidden: You do not own the chatbot associated with this document.', 403);
    }

    req.targetSource = source;
    next();
  } catch (err) {
    logger.error('requireSourceOwnership error:', err.message);
    return errorResponse(res, 'Failed to verify source ownership.', 500);
  }
}
