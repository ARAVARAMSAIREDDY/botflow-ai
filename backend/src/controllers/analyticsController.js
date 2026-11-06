import { analyticsService } from '../services/analyticsService.js';
import { knowledgeGapService } from '../services/knowledgeGapService.js';
import { feedbackService } from '../services/feedbackService.js';
import { chatbotService } from '../services/chatbotService.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const analyticsController = {
  /**
   * GET /api/analytics/dashboard
   * Returns complete metrics, time-series chart data, FAQs, and satisfaction
   */
  async getDashboard(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const {
        chatbotId = null,
        period = 'weekly',
        startDate = null,
        endDate = null
      } = req.query;

      const data = await analyticsService.getUserDashboardAnalytics({
        userId,
        chatbotId,
        period,
        startDate,
        endDate
      });

      return successResponse(res, data, 'Analytics metrics retrieved successfully');
    } catch (err) {
      if (err.message.includes('forbidden')) {
        return errorResponse(res, err.message, 403);
      }
      next(err);
    }
  },

  /**
   * GET /api/analytics/knowledge-gaps
   * Retrieves list of unanswered questions and frequency
   */
  async getKnowledgeGaps(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const { chatbotId = null, status = 'all', limit = 50, page = 1 } = req.query;

      const userBots = await chatbotService.listChatbots(userId);
      let targetBotIds = userBots.map(b => b.id);

      if (chatbotId && chatbotId !== 'all') {
        if (!targetBotIds.includes(chatbotId)) {
          return errorResponse(res, 'Access forbidden: You do not own this chatbot.', 403);
        }
        targetBotIds = [chatbotId];
      }

      const result = await knowledgeGapService.listKnowledgeGaps({
        chatbotIds: targetBotIds,
        status,
        limit,
        page
      });

      return successResponse(res, result, 'Knowledge gaps retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/analytics/knowledge-gaps/:id
   * Updates status of a knowledge gap (addressed/ignored)
   */
  async updateKnowledgeGap(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      if (!status || !['open', 'addressed', 'ignored'].includes(status)) {
        return errorResponse(res, 'Valid status is required (open, addressed, ignored).', 400);
      }

      const updated = await knowledgeGapService.updateKnowledgeGapStatus(id, status);
      if (!updated) {
        return errorResponse(res, 'Knowledge gap not found.', 404);
      }

      return successResponse(res, updated, 'Knowledge gap updated');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/analytics/feedback
   * Retrieves customer feedback list and ratings
   */
  async getFeedback(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const { chatbotId = null, limit = 50, page = 1, minRating, maxRating } = req.query;

      const userBots = await chatbotService.listChatbots(userId);
      let targetBotIds = userBots.map(b => b.id);

      if (chatbotId && chatbotId !== 'all') {
        if (!targetBotIds.includes(chatbotId)) {
          return errorResponse(res, 'Access forbidden: You do not own this chatbot.', 403);
        }
        targetBotIds = [chatbotId];
      }

      const result = await feedbackService.listFeedback({
        chatbotIds: targetBotIds,
        limit,
        page,
        minRating: minRating ? parseInt(minRating, 10) : null,
        maxRating: maxRating ? parseInt(maxRating, 10) : null
      });

      return successResponse(res, result, 'Customer feedback retrieved');
    } catch (err) {
      next(err);
    }
  }
};

export default analyticsController;
