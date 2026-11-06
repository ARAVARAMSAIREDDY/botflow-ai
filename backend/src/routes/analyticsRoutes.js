import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Protected: main dashboard metrics
router.get('/dashboard', requireAuth, analyticsController.getDashboard);

// Protected: knowledge gaps
router.get('/knowledge-gaps', requireAuth, analyticsController.getKnowledgeGaps);
router.patch('/knowledge-gaps/:id', requireAuth, analyticsController.updateKnowledgeGap);

// Protected: customer feedback
router.get('/feedback', requireAuth, analyticsController.getFeedback);

export default router;
