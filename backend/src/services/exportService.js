import { conversationService } from './conversationService.js';
import { analyticsService } from './analyticsService.js';
import { feedbackService } from './feedbackService.js';
import { knowledgeGapService } from './knowledgeGapService.js';
import { chatbotService } from './chatbotService.js';

/**
 * Escapes values for safe CSV rendering
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export const exportService = {
  /**
   * Generates CSV for conversation transcripts
   */
  async exportConversationsCsv({ userId, chatbotId = null, status = 'all', startDate = null, endDate = null }) {
    const userBots = await chatbotService.listChatbots(userId);
    let targetBotIds = userBots.map(b => b.id);
    if (chatbotId && chatbotId !== 'all') {
      if (!targetBotIds.includes(chatbotId)) {
        throw new Error('Access forbidden: You do not own the requested chatbot.');
      }
      targetBotIds = [chatbotId];
    }

    const { conversations } = await conversationService.listConversations({
      chatbotIds: targetBotIds,
      limit: 1000,
      page: 1,
      status,
      startDate,
      endDate
    });

    const botMap = {};
    for (const b of userBots) botMap[b.id] = b.name;

    const headers = [
      'Conversation ID',
      'Chatbot Name',
      'Visitor / Session ID',
      'Status',
      'Rating',
      'Feedback Comment',
      'Assigned Agent',
      'Message Count',
      'Created At',
      'Resolved At'
    ];

    const rows = [headers.join(',')];

    for (const c of conversations) {
      rows.push([
        escapeCsv(c.id),
        escapeCsv(botMap[c.chatbot_id] || c.chatbot_id),
        escapeCsv(c.user_identifier || c.session_id),
        escapeCsv(c.status),
        escapeCsv(c.rating || 'N/A'),
        escapeCsv(c.feedback_comment || ''),
        escapeCsv(c.assigned_agent_name || 'AI Assistant'),
        escapeCsv(c.messageCount || 0),
        escapeCsv(c.created_at),
        escapeCsv(c.resolved_at || '')
      ].join(','));
    }

    return rows.join('\r\n');
  },

  /**
   * Generates CSV for analytics activity summary
   */
  async exportAnalyticsCsv({ userId, chatbotId = null, period = 'weekly' }) {
    const analytics = await analyticsService.getUserDashboardAnalytics({
      userId,
      chatbotId,
      period
    });

    const headers = [
      'Date',
      'Day / Label',
      'Conversations',
      'Messages',
      'Visitors'
    ];

    const rows = [headers.join(',')];

    for (const point of analytics.activityTimeSeries || []) {
      rows.push([
        escapeCsv(point.date),
        escapeCsv(point.label),
        escapeCsv(point.conversations),
        escapeCsv(point.messages),
        escapeCsv(point.messages),
        escapeCsv(point.visitors)
      ].join(','));
    }

    return rows.join('\r\n');
  },

  /**
   * Generates CSV for customer feedback ratings and comments
   */
  async exportFeedbackCsv({ userId, chatbotId = null }) {
    const userBots = await chatbotService.listChatbots(userId);
    let targetBotIds = userBots.map(b => b.id);
    if (chatbotId && chatbotId !== 'all') {
      if (!targetBotIds.includes(chatbotId)) {
        throw new Error('Access forbidden: You do not own the requested chatbot.');
      }
      targetBotIds = [chatbotId];
    }

    const { feedback } = await feedbackService.listFeedback({
      chatbotIds: targetBotIds,
      limit: 1000,
      page: 1
    });

    const botMap = {};
    for (const b of userBots) botMap[b.id] = b.name;

    const headers = [
      'Feedback ID',
      'Chatbot Name',
      'Conversation ID',
      'Rating (1-5)',
      'Thumbs Up',
      'Customer Comment',
      'Visitor Identifier',
      'Submitted At'
    ];

    const rows = [headers.join(',')];

    for (const item of feedback) {
      rows.push([
        escapeCsv(item.id),
        escapeCsv(botMap[item.chatbot_id] || item.chatbot_id),
        escapeCsv(item.conversation_id),
        escapeCsv(item.rating),
        escapeCsv(item.thumbs_up ? 'Yes' : 'No'),
        escapeCsv(item.comment || ''),
        escapeCsv(item.user_identifier || 'Anonymous Visitor'),
        escapeCsv(item.created_at)
      ].join(','));
    }

    return rows.join('\r\n');
  },

  /**
   * Generates CSV for knowledge gaps (unanswered queries)
   */
  async exportKnowledgeGapsCsv({ userId, chatbotId = null }) {
    const userBots = await chatbotService.listChatbots(userId);
    let targetBotIds = userBots.map(b => b.id);
    if (chatbotId && chatbotId !== 'all') {
      if (!targetBotIds.includes(chatbotId)) {
        throw new Error('Access forbidden: You do not own the requested chatbot.');
      }
      targetBotIds = [chatbotId];
    }

    const { gaps } = await knowledgeGapService.listKnowledgeGaps({
      chatbotIds: targetBotIds,
      limit: 1000,
      page: 1
    });

    const botMap = {};
    for (const b of userBots) botMap[b.id] = b.name;

    const headers = [
      'Gap ID',
      'Chatbot Name',
      'Unanswered Question',
      'Occurrence Frequency',
      'Suggested Document Topic',
      'Status',
      'Last Asked At'
    ];

    const rows = [headers.join(',')];

    for (const gap of gaps) {
      rows.push([
        escapeCsv(gap.id),
        escapeCsv(botMap[gap.chatbot_id] || gap.chatbot_id),
        escapeCsv(gap.question),
        escapeCsv(gap.frequency || 1),
        escapeCsv(gap.suggested_topic || 'General Knowledge'),
        escapeCsv(gap.status || 'open'),
        escapeCsv(gap.last_asked_at)
      ].join(','));
    }

    return rows.join('\r\n');
  }
};

export default exportService;
