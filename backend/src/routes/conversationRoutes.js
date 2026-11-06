import { Router } from 'express';
import { conversationController } from '../controllers/conversationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Protected: list conversations with search, filters & pagination
router.get('/', requireAuth, conversationController.listConversations);

// Protected: get complete transcript
router.get('/:id/transcript', requireAuth, conversationController.getTranscript);

// Protected: update conversation status (resolved, closed, active, handed_over)
router.patch('/:id/status', requireAuth, conversationController.updateStatus);

// Protected: send human agent reply
router.post('/:id/agent-reply', requireAuth, conversationController.sendAgentReply);

// Public / Visitor: request human handoff
router.post('/:id/handoff', conversationController.requestHandoff);

// Public / Visitor: submit feedback
router.post('/:id/feedback', conversationController.submitFeedback);

// Backward-compatibility: GET /api/conversations/:chatbotId
router.get('/:chatbotId', conversationController.getConversationsByChatbot);

export default router;
