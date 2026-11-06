import { knowledgeService } from '../services/knowledgeService.js';
import { vectorStoreService } from '../services/vectorStoreService.js';
import { chatbotService } from '../services/chatbotService.js';
import { billingService } from '../services/billingService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const uploadDocument = async (req, res, next) => {
  try {
    const { chatbotId } = req.body;
    const file = req.file;

    if (!chatbotId) {
      return errorResponse(res, 'The "chatbotId" field is required.', 400);
    }

    if (!file) {
      return errorResponse(res, 'No file was provided in the upload request.', 400);
    }

    const chatbot = await chatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      return errorResponse(res, `Chatbot with ID "${chatbotId}" does not exist.`, 404);
    }

    // Strict Tenant Isolation: user can only upload to their own bot
    if (chatbot.user_id && req.user?.id && chatbot.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You do not own this chatbot.', 403);
    }

    // Quota check: document knowledge sources limit
    const ownerUserId = chatbot.user_id || req.user?.id;
    if (ownerUserId) {
      const quota = await billingService.checkUsageLimit(ownerUserId, 'documents');
      if (!quota.allowed) {
        return errorResponse(
          res,
          `Plan limit exceeded: You have reached your limit of ${quota.limit} knowledge documents/sources on the ${quota.planCode.toUpperCase()} plan. Please upgrade your plan to upload more files.`,
          403,
          'PLAN_LIMIT_EXCEEDED'
        );
      }
    }

    const source = await knowledgeService.ingestUploadedFile({
      chatbotId,
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size
    });

    return successResponse(res, source, 'File uploaded and ingestion initiated successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const ingestUrl = async (req, res, next) => {
  try {
    const { chatbotId, url } = req.body;

    if (!chatbotId) {
      return errorResponse(res, 'The "chatbotId" field is required.', 400);
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      return errorResponse(res, 'A valid website "url" is required.', 400);
    }

    const chatbot = await chatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      return errorResponse(res, `Chatbot with ID "${chatbotId}" does not exist.`, 404);
    }

    // Strict Tenant Isolation
    if (chatbot.user_id && req.user?.id && chatbot.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You do not own this chatbot.', 403);
    }

    // Quota check: document knowledge sources limit
    const ownerUserId = chatbot.user_id || req.user?.id;
    if (ownerUserId) {
      const quota = await billingService.checkUsageLimit(ownerUserId, 'documents');
      if (!quota.allowed) {
        return errorResponse(
          res,
          `Plan limit exceeded: You have reached your limit of ${quota.limit} knowledge documents/sources on the ${quota.planCode.toUpperCase()} plan. Please upgrade your plan to ingest more URLs.`,
          403,
          'PLAN_LIMIT_EXCEEDED'
        );
      }
    }

    const source = await knowledgeService.ingestWebsiteUrl({
      chatbotId,
      url: url.trim()
    });

    return successResponse(res, source, 'Website URL queued for knowledge ingestion', 201);
  } catch (error) {
    next(error);
  }
};

export const getChatbotKnowledge = async (req, res, next) => {
  try {
    const { chatbotId } = req.params;

    const chatbot = await chatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      return errorResponse(res, `Chatbot with ID "${chatbotId}" does not exist.`, 404);
    }

    // Strict Tenant Isolation
    if (chatbot.user_id && req.user?.id && chatbot.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You do not have permission to view documents for this chatbot.', 403);
    }

    const sources = await knowledgeService.listSourcesByChatbotId(chatbotId);
    const stats = await vectorStoreService.getChatbotStats(chatbotId);

    const totalChunks = sources.reduce((sum, s) => sum + (s.chunk_count || 0), 0);

    return successResponse(res, {
      chatbotId,
      chatbotName: chatbot.name,
      sources,
      stats: {
        totalSources: sources.length,
        totalChunks: totalChunks || stats.indexedChunks,
        readySources: sources.filter(s => s.status === 'ready').length,
        processingSources: sources.filter(s => s.status === 'processing').length,
        failedSources: sources.filter(s => s.status === 'failed').length
      }
    }, 'Knowledge base retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getSourceDetails = async (req, res, next) => {
  try {
    const { sourceId } = req.params;
    const source = await knowledgeService.getSourceById(sourceId);

    if (!source) {
      return errorResponse(res, `Knowledge source with ID "${sourceId}" was not found.`, 404);
    }

    // Verify parent chatbot ownership
    const parentBot = await chatbotService.getChatbotById(source.chatbot_id);
    if (parentBot?.user_id && req.user?.id && parentBot.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You do not have permission to access this document.', 403);
    }

    const chunks = await vectorStoreService.getChunksBySourceId(sourceId);

    return successResponse(res, {
      ...source,
      chunks
    }, 'Source details retrieved');
  } catch (error) {
    next(error);
  }
};

export const deleteSource = async (req, res, next) => {
  try {
    const { sourceId } = req.params;
    const source = await knowledgeService.getSourceById(sourceId);

    if (!source) {
      return errorResponse(res, `Knowledge source with ID "${sourceId}" not found or already deleted.`, 404);
    }

    // Verify parent chatbot ownership
    const parentBot = await chatbotService.getChatbotById(source.chatbot_id);
    if (parentBot?.user_id && req.user?.id && parentBot.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You do not own this document.', 403);
    }

    const deleted = await knowledgeService.deleteSource(sourceId);

    if (!deleted) {
      return errorResponse(res, `Knowledge source with ID "${sourceId}" could not be deleted.`, 404);
    }

    return successResponse(res, { id: sourceId }, 'Knowledge source and vector chunks deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const reindexSource = async (req, res, next) => {
  try {
    const { sourceId } = req.params;
    const source = await knowledgeService.getSourceById(sourceId);

    if (!source) {
      return errorResponse(res, `Knowledge source with ID "${sourceId}" was not found.`, 404);
    }

    // Verify parent chatbot ownership
    const parentBot = await chatbotService.getChatbotById(source.chatbot_id);
    if (parentBot?.user_id && req.user?.id && parentBot.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You do not own this document.', 403);
    }

    const reindexed = await knowledgeService.reindexSource(sourceId);

    return successResponse(res, reindexed, 'Knowledge source reindexing started');
  } catch (error) {
    next(error);
  }
};
