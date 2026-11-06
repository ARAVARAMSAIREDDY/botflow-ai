import { exportService } from '../services/exportService.js';
import { errorResponse } from '../utils/response.js';

export const exportController = {
  /**
   * GET /api/export/conversations
   */
  async exportConversations(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const { chatbotId = null, status = 'all', startDate = null, endDate = null } = req.query;

      const csvData = await exportService.exportConversationsCsv({
        userId,
        chatbotId,
        status,
        startDate,
        endDate
      });

      const filename = `botflow_conversations_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvData);
    } catch (err) {
      if (err.message.includes('forbidden')) {
        return errorResponse(res, err.message, 403);
      }
      next(err);
    }
  },

  /**
   * GET /api/export/analytics
   */
  async exportAnalytics(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const { chatbotId = null, period = 'weekly' } = req.query;

      const csvData = await exportService.exportAnalyticsCsv({
        userId,
        chatbotId,
        period
      });

      const filename = `botflow_analytics_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvData);
    } catch (err) {
      if (err.message.includes('forbidden')) {
        return errorResponse(res, err.message, 403);
      }
      next(err);
    }
  },

  /**
   * GET /api/export/feedback
   */
  async exportFeedback(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const { chatbotId = null } = req.query;

      const csvData = await exportService.exportFeedbackCsv({
        userId,
        chatbotId
      });

      const filename = `botflow_customer_feedback_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvData);
    } catch (err) {
      if (err.message.includes('forbidden')) {
        return errorResponse(res, err.message, 403);
      }
      next(err);
    }
  },

  /**
   * GET /api/export/knowledge-gaps
   */
  async exportKnowledgeGaps(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const { chatbotId = null } = req.query;

      const csvData = await exportService.exportKnowledgeGapsCsv({
        userId,
        chatbotId
      });

      const filename = `botflow_knowledge_gaps_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvData);
    } catch (err) {
      if (err.message.includes('forbidden')) {
        return errorResponse(res, err.message, 403);
      }
      next(err);
    }
  }
};

export default exportController;
