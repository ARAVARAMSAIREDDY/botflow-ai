import { generateAIResponse } from '../services/aiService.js';
import { chatbotService } from '../services/chatbotService.js';
import { conversationService } from '../services/conversationService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import { vectorStoreService } from '../services/vectorStoreService.js';
import { billingService } from '../services/billingService.js';
import { knowledgeGapService } from '../services/knowledgeGapService.js';
import { analyticsService } from '../services/analyticsService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const handleChatMessage = async (req, res, next) => {
  try {
    const { chatbotId, sessionId, history = [] } = req.body;
    const message = req.sanitizedMessage;

    // 1. Resolve chatbot configuration
    let chatbot = null;
    if (chatbotId) {
      chatbot = await chatbotService.getChatbotById(chatbotId);
    }

    if (!chatbot) {
      const bots = await chatbotService.listChatbots();
      chatbot = bots[0] || {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'BotFlow AI Assistant',
        mode: 'general',
        tone: 'friendly'
      };
    }

    // 2. Enforce monthly message quota for bot owner
    const ownerUserId = chatbot.user_id || req.user?.id;
    if (ownerUserId) {
      const quota = await billingService.checkUsageLimit(ownerUserId, 'messages');
      if (!quota.allowed) {
        return errorResponse(
          res,
          `Monthly message limit reached (${quota.current}/${quota.limit}). Please upgrade your plan to continue chatting.`,
          403,
          'PLAN_LIMIT_EXCEEDED'
        );
      }
    }

    // 3. Resolve or create conversation session
    const conversation = await conversationService.getOrCreateConversation(
      chatbot.id,
      sessionId
    );

    // 3. Save incoming user message
    const userMsg = await conversationService.addMessage(
      conversation.id,
      'user',
      message
    );

    // Human support handoff trigger detection
    const humanIntentRegex = /(talk|speak|connect|transfer|chat).{0,15}(human|agent|person|representative|support team)/i;
    if (humanIntentRegex.test(message)) {
      await conversationService.requestHumanHandoff(conversation.id, req.user?.email || 'User');
    }

    // 4. RAG PIPELINE: Query embedding & vector similarity search
    logger.info(`Processing chat query for bot "${chatbot.name}" (Mode: ${chatbot.mode})`);
    
    let knowledgeContext = '';
    let sources = [];

    try {
      const queryEmbedding = await generateEmbedding(message);
      const matchingChunks = await vectorStoreService.searchSimilarChunks({
        chatbotId: chatbot.id,
        queryEmbedding,
        topK: 4,
        threshold: 0.28 // inclusive threshold for semantic matching
      });

      if (matchingChunks && matchingChunks.length > 0) {
        logger.info(`RAG Search retrieved ${matchingChunks.length} relevant chunks (top score: ${matchingChunks[0].similarity})`);

        // Format knowledge context with document attribution
        knowledgeContext = matchingChunks.map((chunk, i) => {
          const docTitle = chunk.metadata?.title || 'Knowledge Source';
          const section = chunk.metadata?.chunkIndex !== undefined ? `Section ${chunk.metadata.chunkIndex + 1}` : '';
          return `[Source ${i + 1}: ${docTitle} ${section}]\n${chunk.content}`;
        }).join('\n\n---\n\n');

        // Extract clean unique sources for client citation
        const seenSources = new Set();
        sources = matchingChunks.map(chunk => {
          const title = chunk.metadata?.title || 'Knowledge Source';
          return {
            id: chunk.id,
            sourceId: chunk.sourceId,
            title,
            sourceType: chunk.metadata?.sourceType || 'document',
            chunkIndex: chunk.chunkIndex,
            similarity: chunk.similarity
          };
        }).filter(s => {
          const key = `${s.sourceId}_${s.chunkIndex}`;
          if (seenSources.has(key)) return false;
          seenSources.add(key);
          return true;
        });
      }
    } catch (ragErr) {
      logger.warn('RAG vector retrieval failed, proceeding with general flow:', ragErr.message);
    }

    // 5. If chatbot is strictly in Knowledge Mode and NO matching knowledge was found:
    if (chatbot.mode === 'knowledge' && (!knowledgeContext || sources.length === 0)) {
      const fallbackReply = chatbot.fallback_message || 
        'I am sorry, but I do not have sufficient information in my knowledge base to answer that. Please contact our support team.';

      const botMsg = await conversationService.addMessage(
        conversation.id,
        'bot',
        fallbackReply,
        {
          fallback: true,
          mode: 'knowledge'
        },
        520
      );

      // Record knowledge gap for owner to review and improve documents
      knowledgeGapService.recordKnowledgeGap({
        chatbotId: chatbot.id,
        question: message
      }).catch(err => logger.warn('Knowledge gap record warning:', err.message));

      analyticsService.recordEvent({
        chatbotId: chatbot.id,
        sessionId: conversation.session_id,
        eventType: 'query_unresolved',
        userQuery: message,
        resolved: false
      }).catch(err => logger.warn('Analytics record warning:', err.message));

      return successResponse(res, {
        reply: fallbackReply,
        messageId: botMsg.id,
        conversationId: conversation.id,
        sessionId: conversation.session_id,
        model: 'grounded-fallback',
        tokensUsed: 0,
        sources: [],
        grounded: false,
        bot: {
          id: chatbot.id,
          name: chatbot.name,
          mode: chatbot.mode
        }
      }, 'Fallback response generated (no matching knowledge)');
    }

    // 6. Generate AI response via OpenAI service (incorporating RAG context if found)
    const aiResult = await generateAIResponse({
      message,
      chatbot,
      history,
      knowledgeContext,
      sources
    });

    // 7. Save generated AI response
    const botMsg = await conversationService.addMessage(
      conversation.id,
      'bot',
      aiResult.reply,
      {
        model: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
        apiUsed: aiResult.apiUsed,
        sources: aiResult.sources || []
      }
    );

    // Increment message quota count
    if (ownerUserId) {
      await billingService.incrementMessageCount(ownerUserId);
    }

    // 8. Return response to client with sources and citations
    return successResponse(res, {
      reply: aiResult.reply,
      messageId: botMsg.id,
      conversationId: conversation.id,
      sessionId: conversation.session_id,
      model: aiResult.model,
      tokensUsed: aiResult.tokensUsed,
      sources: aiResult.sources || [],
      grounded: Boolean(knowledgeContext && sources.length > 0),
      bot: {
        id: chatbot.id,
        name: chatbot.name,
        mode: chatbot.mode
      }
    }, 'Message processed successfully');
  } catch (error) {
    next(error);
  }
};
