import { chatbotService } from '../services/chatbotService.js';
import { analyticsService } from '../services/analyticsService.js';
import { billingService } from '../services/billingService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const listChatbots = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const chatbots = await chatbotService.listChatbots(userId);
    return successResponse(res, chatbots, 'Chatbots retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getChatbot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const chatbot = await chatbotService.getChatbotById(id);

    if (!chatbot) {
      return errorResponse(res, `Chatbot with ID "${id}" was not found.`, 404);
    }

    // Tenant authorization check
    if (chatbot.user_id && userId && chatbot.user_id !== userId) {
      return errorResponse(res, 'Access forbidden: You do not own this chatbot.', 403);
    }

    return successResponse(res, chatbot, 'Chatbot details retrieved');
  } catch (error) {
    next(error);
  }
};

export const createChatbot = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;

    // Server-side subscription quota check
    if (userId) {
      const quota = await billingService.checkUsageLimit(userId, 'chatbots');
      if (!quota.allowed) {
        return errorResponse(
          res,
          `Plan limit exceeded: You have reached your limit of ${quota.limit} chatbot(s) on the ${quota.planCode.toUpperCase()} plan. Please upgrade your plan to create more chatbots.`,
          403,
          'PLAN_LIMIT_EXCEEDED'
        );
      }
    }

    const newChatbot = await chatbotService.createChatbot(req.body, userId);
    logger.success(`Created new chatbot: ${newChatbot.name} (${newChatbot.id}) for user ${userId || 'anonymous'}`);
    return successResponse(res, newChatbot, 'Chatbot created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const deleteChatbot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const chatbot = await chatbotService.getChatbotById(id);
    if (!chatbot) {
      return errorResponse(res, `Chatbot with ID "${id}" not found.`, 404);
    }

    if (chatbot.user_id && userId && chatbot.user_id !== userId) {
      return errorResponse(res, 'Access forbidden: You do not own this chatbot.', 403);
    }

    const deleted = await chatbotService.deleteChatbot(id, userId);

    if (!deleted) {
      return errorResponse(res, `Chatbot with ID "${id}" could not be deleted.`, 404);
    }

    logger.info(`Deleted chatbot: ${id}`);
    return successResponse(res, { id }, 'Chatbot deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const updateCustomization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const updated = await chatbotService.updateCustomization(id, userId, req.body);
    return successResponse(res, updated, 'Chatbot widget customization updated');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

export const addDomain = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { domain } = req.body;
    const userId = req.user?.id || null;
    const updated = await chatbotService.addDomain(id, userId, domain);
    return successResponse(res, updated, 'Domain added successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

export const removeDomain = async (req, res, next) => {
  try {
    const { id, domain } = req.params;
    const userId = req.user?.id || null;
    const updated = await chatbotService.removeDomain(id, userId, domain);
    return successResponse(res, updated, 'Domain removed successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

export const toggleRestrictDomains = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { restrict } = req.body;
    const userId = req.user?.id || null;
    const updated = await chatbotService.toggleRestrictDomains(id, userId, restrict);
    return successResponse(res, updated, `Domain restriction ${restrict ? 'enabled' : 'disabled'}`);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const analytics = await analyticsService.getChatbotAnalytics(id);
    return successResponse(res, analytics, 'Chatbot analytics retrieved');
  } catch (error) {
    next(error);
  }
};
