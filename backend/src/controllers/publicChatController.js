import crypto from 'crypto';
import { chatbotService } from '../services/chatbotService.js';
import { aiService } from '../services/aiService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import { vectorStoreService } from '../services/vectorStoreService.js';
import { analyticsService } from '../services/analyticsService.js';
import { billingService } from '../services/billingService.js';
import { conversationService } from '../services/conversationService.js';
import { feedbackService } from '../services/feedbackService.js';
import { knowledgeGapService } from '../services/knowledgeGapService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const publicChatController = {
  /**
   * GET /api/public/chatbots/:publicId/config
   * Returns safe public configuration for client widget embedding
   */
  async getConfig(req, res, next) {
    try {
      const { publicId } = req.params;
      if (!publicId) {
        return errorResponse(res, 'Public identifier is required.', 400);
      }

      const bot = await chatbotService.getChatbotByPublicId(publicId);
      if (!bot) {
        return errorResponse(res, `Chatbot with identifier "${publicId}" was not found.`, 404);
      }

      if (bot.status !== 'active') {
        return errorResponse(res, 'This chatbot is currently paused or inactive.', 403);
      }

      // Domain authorization check
      const hostOrigin = req.headers.origin || req.headers.referer;
      const domainCheck = chatbotService.validateDomainAllowed(bot, hostOrigin);
      if (!domainCheck.allowed) {
        logger.warn(`Public widget domain restriction blocked access from origin "${hostOrigin}" to bot "${publicId}"`);
        return errorResponse(res, domainCheck.reason, 403);
      }

      // Record session start event for analytics
      const sessionId = req.query.sessionId || crypto.randomUUID();
      analyticsService.recordEvent({
        chatbotId: bot.id,
        sessionId,
        eventType: 'session_start',
        referer: hostOrigin,
        ip: req.ip
      }).catch(err => logger.warn('Analytics record warning:', err.message));

      // Public-safe sanitized response
      const publicConfig = {
        publicId: bot.public_id || bot.id,
        name: bot.name,
        description: bot.description || '',
        primaryColor: bot.primary_color || '#7c3aed',
        businessLogo: bot.business_logo || '',
        welcomeMessage: bot.welcome_message || 'Hello! How can I help you today?',
        fallbackMessage: bot.fallback_message || 'I am sorry, but I do not have enough information to answer that question.',
        position: bot.position || 'bottom-right',
        theme: bot.theme || 'light',
        windowSize: bot.window_size || 'standard',
        launcherIcon: bot.launcher_icon || 'message',
        mode: bot.mode || 'general',
        status: bot.status
      };

      return successResponse(res, publicConfig, 'Chatbot configuration loaded');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/public/chat
   * Handles user inquiries sent from the public website widget
   */
  async sendMessage(req, res, next) {
    try {
      const { chatbotId, message, sessionId, history = [] } = req.body;

      // 1. Validation
      if (!message || typeof message !== 'string' || !message.trim()) {
        return errorResponse(res, 'Message text is required.', 400);
      }

      if (message.length > 1000) {
        return errorResponse(res, 'Message exceeds 1,000 character limit.', 400);
      }

      if (!chatbotId) {
        return errorResponse(res, 'Chatbot identifier is required.', 400);
      }

      // 2. Chatbot lookup
      const bot = await chatbotService.getChatbotByPublicId(chatbotId);
      if (!bot) {
        return errorResponse(res, `Chatbot with identifier "${chatbotId}" was not found.`, 404);
      }

      // 3. Status check
      if (bot.status !== 'active') {
        return errorResponse(res, 'This chatbot is currently paused or inactive.', 403);
      }

      // 4. Domain restriction check
      const hostOrigin = req.headers.origin || req.headers.referer;
      const domainCheck = chatbotService.validateDomainAllowed(bot, hostOrigin);
      if (!domainCheck.allowed) {
        logger.warn(`Public widget chat blocked: Origin "${hostOrigin}" not authorized for bot "${chatbotId}"`);
        return errorResponse(res, domainCheck.reason, 403);
      }

      // 5. Message quota enforcement for bot owner
      if (bot.user_id) {
        const quota = await billingService.checkUsageLimit(bot.user_id, 'messages');
        if (!quota.allowed) {
          return errorResponse(
            res,
            'This chatbot has reached its monthly message limit. Please contact the website administrator or site owner.',
            403,
            'PLAN_LIMIT_EXCEEDED'
          );
        }
      }

      // 6. RAG Retrieval (scoped strictly to this chatbot)
      let retrievedContext = '';
      let citations = [];

      try {
        const queryEmbedding = await generateEmbedding(message.trim());
        const searchResults = await vectorStoreService.searchSimilarChunks({
          chatbotId: bot.id,
          queryEmbedding,
          topK: 4,
          threshold: 0.25
        });

        if (searchResults && searchResults.length > 0) {
          retrievedContext = searchResults
            .map((chunk, index) => `[Source ${index + 1}: ${chunk.metadata?.title || 'Document'}]\n${chunk.content}`)
            .join('\n\n');

          citations = searchResults.map(chunk => ({
            title: chunk.metadata?.title || 'Knowledge Base Document',
            sourceType: chunk.metadata?.sourceType || 'document',
            url: chunk.metadata?.url || null,
            snippet: chunk.content ? `${chunk.content.slice(0, 150)}...` : '',
            score: Math.round(chunk.similarity * 100) / 100
          }));
        }
      } catch (embErr) {
        logger.warn(`RAG retrieval warning for bot "${bot.id}":`, embErr.message);
      }

      // 6. Generate AI response
      const aiResult = await aiService.generateChatResponse({
        message: message.trim(),
        history,
        chatbot: bot,
        knowledgeContext: retrievedContext,
        sources: citations
      });

      // 7. Check if response is fallback / unresolved
      const isFallback = aiResult.reply?.toLowerCase().includes('sorry') && 
        (aiResult.reply?.toLowerCase().includes('do not have') || aiResult.reply?.toLowerCase().includes('cannot find'));

      // 8. Conversation and Message Tracking
      const activeSessionId = sessionId || crypto.randomUUID();
      const conv = await conversationService.getOrCreateConversation(
        bot.id,
        activeSessionId,
        hostOrigin ? `Visitor (${hostOrigin})` : 'Website Visitor'
      );

      // Save user message
      await conversationService.addMessage(conv.id, 'user', message.trim());

      // Detect human handoff intent in message
      const humanIntentRegex = /(talk|speak|connect|transfer|chat).{0,15}(human|agent|person|representative|support team)/i;
      let handoffTriggered = false;
      if (humanIntentRegex.test(message)) {
        await conversationService.requestHumanHandoff(conv.id, hostOrigin || 'Website Visitor');
        handoffTriggered = true;
      }

      // Save AI bot response
      await conversationService.addMessage(
        conv.id,
        'bot',
        aiResult.reply,
        {
          citations,
          tokensUsed: aiResult.tokensUsed || 0,
          fallback: isFallback,
          grounded: citations.length > 0
        },
        560
      );

      // Record knowledge gap if response was fallback
      if (isFallback) {
        knowledgeGapService.recordKnowledgeGap({
          chatbotId: bot.id,
          question: message.trim()
        }).catch(err => logger.warn('Knowledge gap recording warning:', err.message));
      }

      // 9. Record analytics event
      analyticsService.recordEvent({
        chatbotId: bot.id,
        sessionId: activeSessionId,
        eventType: handoffTriggered ? 'handoff_request' : isFallback ? 'query_unresolved' : 'message_sent',
        userQuery: message,
        referer: hostOrigin,
        ip: req.ip,
        resolved: !isFallback && !handoffTriggered
      }).catch(err => logger.warn('Analytics record warning:', err.message));

      // 10. Increment bot owner's message quota usage
      if (bot.user_id) {
        await billingService.incrementMessageCount(bot.user_id);
      }

      return successResponse(res, {
        reply: aiResult.reply,
        citations,
        sessionId: activeSessionId,
        conversationId: conv.id,
        handoffTriggered,
        chatbot: {
          publicId: bot.public_id || bot.id,
          name: bot.name,
          primaryColor: bot.primary_color
        }
      }, 'Message processed successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/public/feedback
   * Allows website visitors to submit 1-5 star ratings or thumbs up/down
   */
  async submitFeedback(req, res, next) {
    try {
      const { chatbotId, sessionId, rating, comment, thumbsUp } = req.body;
      if (!chatbotId) {
        return errorResponse(res, 'Chatbot identifier is required.', 400);
      }

      const bot = await chatbotService.getChatbotByPublicId(chatbotId);
      if (!bot) {
        return errorResponse(res, 'Chatbot not found.', 404);
      }

      const conv = await conversationService.getOrCreateConversation(bot.id, sessionId);
      const feedback = await feedbackService.submitFeedback({
        conversationId: conv.id,
        chatbotId: bot.id,
        rating,
        comment,
        thumbsUp
      });

      // Update conversation rating
      await conversationService.updateConversationStatus(conv.id, conv.status);

      return successResponse(res, feedback, 'Feedback submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/public/handoff
   * Explicitly requests human agent from embed widget button
   */
  async requestHandoff(req, res, next) {
    try {
      const { chatbotId, sessionId, userIdentifier } = req.body;
      if (!chatbotId) {
        return errorResponse(res, 'Chatbot identifier is required.', 400);
      }

      const bot = await chatbotService.getChatbotByPublicId(chatbotId);
      if (!bot) {
        return errorResponse(res, 'Chatbot not found.', 404);
      }

      const hostOrigin = req.headers.origin || req.headers.referer;
      const conv = await conversationService.getOrCreateConversation(bot.id, sessionId, userIdentifier || hostOrigin);
      const result = await conversationService.requestHumanHandoff(conv.id, userIdentifier || hostOrigin || 'Website Visitor');

      return successResponse(res, {
        ...result,
        conversationId: conv.id,
        notice: 'A human representative has been notified and will review your conversation. If no representative is immediately online, follow-up assistance will be provided.'
      }, 'Human support requested');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/public/chatbots/:publicId/messages
   * Polls messages for active session so visitors see agent replies
   */
  async getSessionMessages(req, res, next) {
    try {
      const { publicId } = req.params;
      const { sessionId } = req.query;

      if (!sessionId) {
        return errorResponse(res, 'Session identifier is required.', 400);
      }

      const bot = await chatbotService.getChatbotByPublicId(publicId);
      if (!bot) {
        return errorResponse(res, 'Chatbot not found.', 404);
      }

      const conv = await conversationService.getOrCreateConversation(bot.id, sessionId);
      const transcript = await conversationService.getConversationTranscript(conv.id, [bot.id]);

      return successResponse(res, {
        conversationId: conv.id,
        status: conv.status,
        messages: transcript.messages || []
      }, 'Session messages retrieved');
    } catch (err) {
      next(err);
    }
  }
};
