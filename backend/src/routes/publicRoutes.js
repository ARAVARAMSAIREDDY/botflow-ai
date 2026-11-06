import { Router } from 'express';
import { publicChatController } from '../controllers/publicChatController.js';
import { publicWidgetLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public chatbot configuration for embed widget
router.get('/chatbots/:publicId/config', publicWidgetLimiter, publicChatController.getConfig);

// Public messages polling (to see human agent replies)
router.get('/chatbots/:publicId/messages', publicWidgetLimiter, publicChatController.getSessionMessages);

// Public chat inquiry endpoint
router.post('/chat', publicWidgetLimiter, publicChatController.sendMessage);

// Public visitor feedback submission
router.post('/feedback', publicWidgetLimiter, publicChatController.submitFeedback);

// Public visitor human handoff request
router.post('/handoff', publicWidgetLimiter, publicChatController.requestHandoff);

export default router;
