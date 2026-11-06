import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * Centralized express error handler
 */
export const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url} - Error: ${err.message}`, err.stack);

  // OpenAI specific error handling
  if (err.name === 'APIError' || err.status) {
    if (err.status === 401) {
      return errorResponse(res, 'AI service authentication failed. Please check the backend API key.', 401);
    }
    if (err.status === 429) {
      return errorResponse(res, 'AI service rate limit reached. Please retry in a few moments.', 429);
    }
    if (err.status >= 500) {
      return errorResponse(res, 'AI service is temporarily unavailable. Please try again shortly.', 502);
    }
  }

  // Syntax / Malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'Malformed JSON payload in request body.', 400);
  }

  // Generic 500 internal server error (never leak stack trace or internal secrets)
  const isDev = process.env.NODE_ENV === 'development';
  return errorResponse(
    res,
    isDev ? err.message : 'An internal server error occurred. Please contact the administrator.',
    500,
    isDev ? err.stack : null
  );
};

/**
 * 404 Route Not Found handler
 */
export const notFoundHandler = (req, res) => {
  return errorResponse(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
};
