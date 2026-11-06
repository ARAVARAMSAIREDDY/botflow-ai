import { errorResponse } from '../utils/response.js';

/**
 * Validates chat request payloads
 */
export const validateChatRequest = (req, res, next) => {
  const { message, chatbotId, history } = req.body;

  if (!message || typeof message !== 'string') {
    return errorResponse(res, 'The "message" field is required and must be a string.', 400);
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    return errorResponse(res, 'The "message" cannot be empty.', 400);
  }

  // Input length limit: prevent massive denial-of-service / token-exhaustion payloads
  if (trimmedMessage.length > 3000) {
    return errorResponse(res, 'Message exceeds maximum allowed length of 3,000 characters.', 400);
  }

  // Validate history if supplied
  if (history && !Array.isArray(history)) {
    return errorResponse(res, 'The "history" field must be an array of prior messages.', 400);
  }

  req.sanitizedMessage = trimmedMessage;
  next();
};

/**
 * Validates chatbot creation payloads
 */
export const validateChatbotCreate = (req, res, next) => {
  const { name, mode, tone, domain } = req.body;

  if (!name || typeof name !== 'string') {
    return errorResponse(res, 'The "name" field is required and must be a string.', 400);
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    return errorResponse(res, 'Chatbot name must be between 2 and 80 characters.', 400);
  }

  const allowedModes = ['general', 'knowledge'];
  if (mode && !allowedModes.includes(mode)) {
    return errorResponse(res, `Invalid mode. Must be one of: ${allowedModes.join(', ')}`, 400);
  }

  const allowedTones = ['friendly', 'professional', 'empathetic', 'academic', 'casual', 'strict'];
  if (tone && !allowedTones.includes(tone)) {
    return errorResponse(res, `Invalid tone. Must be one of: ${allowedTones.join(', ')}`, 400);
  }

  req.body.name = trimmedName;
  next();
};
