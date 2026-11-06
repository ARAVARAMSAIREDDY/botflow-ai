import OpenAI from 'openai';
import { env, isOpenAIConfigured } from './env.js';
import { logger } from '../utils/logger.js';

let openaiClient = null;

if (isOpenAIConfigured()) {
  try {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
    logger.success(`OpenAI SDK initialized successfully (Model: ${env.OPENAI_MODEL})`);
  } catch (err) {
    logger.error('Failed to initialize OpenAI client:', err.message);
  }
} else {
  logger.warn('OPENAI_API_KEY is not configured in backend/.env. AI service will operate in mock/sandbox mode.');
}

export const getOpenAIClient = () => openaiClient;
export { openaiClient };
