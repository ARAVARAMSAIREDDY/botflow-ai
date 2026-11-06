import { Router } from 'express';
import { exportController } from '../controllers/exportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/conversations', requireAuth, exportController.exportConversations);
router.get('/analytics', requireAuth, exportController.exportAnalytics);
router.get('/feedback', requireAuth, exportController.exportFeedback);
router.get('/knowledge-gaps', requireAuth, exportController.exportKnowledgeGaps);

export default router;
