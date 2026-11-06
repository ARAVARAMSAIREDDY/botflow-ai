import { Router } from 'express';
import { handleChatMessage } from '../controllers/chatController.js';
import { validateChatRequest } from '../middleware/validator.js';
import { chatLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/chat - accepts user message and returns AI response
router.post('/', chatLimiter, validateChatRequest, handleChatMessage);

export default router;
