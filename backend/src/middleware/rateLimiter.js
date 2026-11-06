import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Stricter limiter for chat AI completions to avoid abuse
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // max 30 chat requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    error: 'Chat rate limit exceeded. Please wait a few seconds before sending another message.'
  }
});

// Dedicated public widget rate limiter with burst protection
export const publicWidgetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Public widget rate limit exceeded. Please wait a moment before sending more messages.'
    });
  }
});

