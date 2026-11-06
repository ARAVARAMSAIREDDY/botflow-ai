import { conversationService } from '../services/conversationService.js';
import { chatbotService } from '../services/chatbotService.js';
import { feedbackService } from '../services/feedbackService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const conversationController = {
  /**
   * GET /api/conversations
   * Lists conversations for the authenticated user's chatbots with search, status filter, and pagination
   */
  async listConversations(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const {
        page = 1,
        limit = 20,
        search = '',
        status = 'all',
        chatbotId = null,
        startDate = null,
        endDate = null
      } = req.query;

      // Get user's authorized chatbots
      const userBots = await chatbotService.listChatbots(userId);
      let targetBotIds = userBots.map(b => b.id);

      if (chatbotId && chatbotId !== 'all') {
        if (!targetBotIds.includes(chatbotId)) {
          return errorResponse(res, 'Access forbidden: You do not own this chatbot.', 403);
        }
        targetBotIds = [chatbotId];
      }

      const result = await conversationService.listConversations({
        chatbotIds: targetBotIds,
        page,
        limit,
        search,
        status,
        startDate,
        endDate
      });

      return successResponse(res, result, 'Conversations retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/conversations/:id/transcript
   * Returns complete conversation transcript with citations and metadata
   */
  async getTranscript(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const userBots = await chatbotService.listChatbots(userId);
      const botIds = userBots.map(b => b.id);

      const transcript = await conversationService.getConversationTranscript(id, botIds);
      return successResponse(res, transcript, 'Conversation transcript retrieved');
    } catch (err) {
      if (err.message.includes('forbidden')) {
        return errorResponse(res, err.message, 403);
      }
      if (err.message.includes('not found')) {
        return errorResponse(res, err.message, 404);
      }
      next(err);
    }
  },

  /**
   * PATCH /api/conversations/:id/status
   * Updates conversation status (e.g. resolved, closed, active, handed_over)
   */
  async updateStatus(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      if (!status) {
        return errorResponse(res, 'The "status" field is required.', 400);
      }

      const userBots = await chatbotService.listChatbots(userId);
      const botIds = userBots.map(b => b.id);

      const updated = await conversationService.updateConversationStatus(id, status, botIds);
      return successResponse(res, updated, `Conversation marked as ${status}`);
    } catch (err) {
      if (err.message.includes('forbidden')) {
        return errorResponse(res, err.message, 403);
      }
      next(err);
    }
  },

  /**
   * POST /api/conversations/:id/agent-reply
   * Human agent sends a response to the visitor
   */
  async sendAgentReply(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { message, agentName } = req.body;

      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      if (!message || !message.trim()) {
        return errorResponse(res, 'Message text is required.', 400);
      }

      const userBots = await chatbotService.listChatbots(userId);
      const botIds = userBots.map(b => b.id);

      const agentReply = await conversationService.addAgentReply({
        conversationId: id,
        agentName: agentName || req.user.full_name || 'Support Representative',
        content: message.trim(),
        chatbotIds: botIds
      });

      return successResponse(res, agentReply, 'Agent response dispatched successfully', 201);
    } catch (err) {
      if (err.message.includes('forbidden')) {
        return errorResponse(res, err.message, 403);
      }
      next(err);
    }
  },

  /**
   * POST /api/conversations/:id/handoff
   * Visitor requests human support
   */
  async requestHandoff(req, res, next) {
    try {
      const { id } = req.params;
      const { userIdentifier } = req.body;

      const result = await conversationService.requestHumanHandoff(id, userIdentifier);
      return successResponse(res, result, 'Human support requested');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/conversations/:id/feedback
   * Visitor submits rating and feedback
   */
  async submitFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { rating, comment, thumbsUp, userIdentifier } = req.body;

      const conv = await conversationService.getConversationById(id);
      if (!conv) {
        return errorResponse(res, 'Conversation not found.', 404);
      }

      const feedback = await feedbackService.submitFeedback({
        conversationId: id,
        chatbotId: conv.chatbot_id,
        rating,
        comment,
        thumbsUp,
        userIdentifier
      });

      return successResponse(res, feedback, 'Feedback received with thanks', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Backward-compatibility handler for Phase 2: GET /api/conversations/:chatbotId
   */
  async getConversationsByChatbot(req, res, next) {
    try {
      const { chatbotId } = req.params;
      const limit = parseInt(req.query.limit, 10) || 20;

      const chatbot = await chatbotService.getChatbotById(chatbotId);
      if (!chatbot) {
        return errorResponse(res, `Chatbot with ID "${chatbotId}" does not exist.`, 404);
      }

      const conversations = await conversationService.getConversationsByChatbotId(chatbotId, limit);
      return successResponse(res, conversations, 'Conversations retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
};

// Export individual functions for backward-compat imports
export const getConversationsByChatbot = conversationController.getConversationsByChatbot;
export default conversationController;
