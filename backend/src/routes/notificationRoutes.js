import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, notificationController.getNotifications);
router.patch('/:id/read', requireAuth, notificationController.markRead);
router.post('/read-all', requireAuth, notificationController.markAllRead);

export default router;
