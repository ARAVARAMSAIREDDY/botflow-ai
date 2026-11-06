import { notificationService } from '../services/notificationService.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const notificationController = {
  /**
   * GET /api/notifications
   * Retrieves notifications with unread count
   */
  async getNotifications(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const { unreadOnly = 'false', limit = 50, page = 1 } = req.query;

      const result = await notificationService.getUserNotifications(userId, {
        unreadOnly: unreadOnly === 'true',
        limit: parseInt(limit, 10) || 50,
        page: parseInt(page, 10) || 1
      });

      return successResponse(res, result, 'Notifications retrieved');
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/notifications/:id/read
   * Marks a single notification as read
   */
  async markRead(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      await notificationService.markAsRead(id, userId);
      return successResponse(res, { success: true }, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/notifications/read-all
   * Marks all user notifications as read
   */
  async markAllRead(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      await notificationService.markAllAsRead(userId);
      return successResponse(res, { success: true }, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
};

export default notificationController;
