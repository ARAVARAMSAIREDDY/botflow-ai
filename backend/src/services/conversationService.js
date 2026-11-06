import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getSupabaseClient } from '../config/supabase.js';
import { isSupabaseConfigured } from '../config/env.js';
import { notificationService } from './notificationService.js';
import { chatbotService } from './chatbotService.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function loadConversations() {
  try {
    if (!fs.existsSync(CONVERSATIONS_FILE)) {
      await fs.promises.writeFile(CONVERSATIONS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = await fs.promises.readFile(CONVERSATIONS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error('Failed to load local conversations:', err.message);
    return [];
  }
}

async function saveConversations(items) {
  try {
    await fs.promises.writeFile(CONVERSATIONS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save local conversations:', err.message);
  }
}

async function loadMessages() {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) {
      await fs.promises.writeFile(MESSAGES_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = await fs.promises.readFile(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error('Failed to load local messages:', err.message);
    return [];
  }
}

async function saveMessages(items) {
  try {
    await fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save local messages:', err.message);
  }
}

export const conversationService = {
  /**
   * Finds or creates a conversation session
   */
  async getOrCreateConversation(chatbotId, sessionId = null, userIdentifier = 'Anonymous Visitor') {
    const finalSessionId = sessionId || crypto.randomUUID();

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: existing } = await supabase
          .from('conversations')
          .select('*')
          .eq('chatbot_id', chatbotId)
          .eq('session_id', finalSessionId)
          .single();

        if (existing) {
          return existing;
        }

        const { data: created, error } = await supabase
          .from('conversations')
          .insert([{
            chatbot_id: chatbotId,
            session_id: finalSessionId,
            user_identifier: userIdentifier,
            status: 'active'
          }])
          .select()
          .single();

        if (!error && created) {
          return created;
        }
      } catch (err) {
        logger.warn('Supabase getOrCreateConversation warning, using local file:', err.message);
      }
    }

    const conversations = await loadConversations();
    const existing = conversations.find(
      c => c.chatbot_id === chatbotId && c.session_id === finalSessionId
    );

    if (existing) {
      return existing;
    }

    const newConv = {
      id: crypto.randomUUID(),
      chatbot_id: chatbotId,
      session_id: finalSessionId,
      user_identifier: userIdentifier,
      status: 'active',
      rating: null,
      feedback_comment: null,
      assigned_agent_name: null,
      resolved_at: null,
      handed_over_at: null,
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    conversations.unshift(newConv);
    await saveConversations(conversations);
    return newConv;
  },

  /**
   * Records a user, bot, or human agent message in a conversation
   */
  async addMessage(conversationId, sender, content, metadata = {}, responseTimeMs = 0) {
    const msg = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender,
      content,
      tokens_used: metadata.tokensUsed || 0,
      response_time_ms: responseTimeMs,
      metadata,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .insert([msg])
          .select()
          .single();

        if (!error && data) {
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);
          return data;
        }
      } catch (err) {
        logger.warn('Supabase addMessage error, using local fallback:', err.message);
      }
    }

    const messages = await loadMessages();
    messages.push(msg);
    // Keep up to 10,000 local messages
    if (messages.length > 10000) {
      messages.splice(0, messages.length - 10000);
    }
    await saveMessages(messages);

    const conversations = await loadConversations();
    const cIdx = conversations.findIndex(c => c.id === conversationId);
    if (cIdx !== -1) {
      conversations[cIdx].updated_at = new Date().toISOString();
      await saveConversations(conversations);
    }

    return msg;
  },

  /**
   * Retrieves conversation by ID
   */
  async getConversationById(conversationId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();
        if (data) return data;
      } catch (err) {
        logger.warn('Supabase getConversationById warning:', err.message);
      }
    }

    const convs = await loadConversations();
    return convs.find(c => c.id === conversationId) || null;
  },

  /**
   * Lists conversations belonging to a set of chatbot IDs with search, filter, and pagination
   */
  async listConversations({
    chatbotIds = [],
    page = 1,
    limit = 20,
    search = '',
    status = 'all',
    startDate = null,
    endDate = null
  }) {
    const cleanLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const cleanPage = Math.max(1, parseInt(page, 10) || 1);
    const idSet = new Set(chatbotIds);

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('conversations')
          .select('*, messages(id, sender, content, created_at, response_time_ms)', { count: 'exact' })
          .order('updated_at', { ascending: false });

        if (chatbotIds.length > 0) {
          query = query.in('chatbot_id', chatbotIds);
        }
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }
        if (startDate) {
          query = query.gte('created_at', new Date(startDate).toISOString());
        }
        if (endDate) {
          query = query.lte('created_at', new Date(endDate).toISOString());
        }
        if (search) {
          query = query.ilike('user_identifier', `%${search}%`);
        }

        const from = (cleanPage - 1) * cleanLimit;
        const to = from + cleanLimit - 1;
        const { data, count, error } = await query.range(from, to);

        if (!error && data) {
          const formatted = data.map(conv => {
            const msgs = conv.messages || [];
            msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            const lastMsg = msgs[msgs.length - 1];
            return {
              ...conv,
              messageCount: msgs.length,
              lastMessage: lastMsg ? {
                content: lastMsg.content,
                sender: lastMsg.sender,
                created_at: lastMsg.created_at
              } : null
            };
          });

          return {
            conversations: formatted,
            totalCount: count || 0,
            totalPages: Math.ceil((count || 0) / cleanLimit) || 1,
            page: cleanPage,
            limit: cleanLimit
          };
        }
      } catch (err) {
        logger.warn('Supabase listConversations warning, fallback to local:', err.message);
      }
    }

    const conversations = await loadConversations();
    const allMessages = await loadMessages();

    let filtered = chatbotIds.length > 0
      ? conversations.filter(c => idSet.has(c.chatbot_id))
      : conversations;

    if (status && status !== 'all') {
      filtered = filtered.filter(c => c.status === status);
    }

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filtered = filtered.filter(c => new Date(c.created_at).getTime() >= startMs);
    }

    if (endDate) {
      const endMs = new Date(endDate).getTime();
      filtered = filtered.filter(c => new Date(c.created_at).getTime() <= endMs);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(c => {
        const matchesUser = (c.user_identifier || '').toLowerCase().includes(q) ||
          (c.session_id || '').toLowerCase().includes(q);
        if (matchesUser) return true;

        // Search message contents in this conversation
        const convMsgs = allMessages.filter(m => m.conversation_id === c.id);
        return convMsgs.some(m => (m.content || '').toLowerCase().includes(q));
      });
    }

    filtered.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / cleanLimit) || 1;
    const startIdx = (cleanPage - 1) * cleanLimit;
    const paginated = filtered.slice(startIdx, startIdx + cleanLimit);

    const formatted = paginated.map(conv => {
      const msgs = allMessages.filter(m => m.conversation_id === conv.id);
      msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const lastMsg = msgs[msgs.length - 1];
      return {
        ...conv,
        messageCount: msgs.length,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          sender: lastMsg.sender,
          created_at: lastMsg.created_at
        } : null
      };
    });

    return {
      conversations: formatted,
      totalCount,
      totalPages,
      page: cleanPage,
      limit: cleanLimit
    };
  },

  /**
   * Retrieves full conversation transcript with all messages, citations, and ratings
   */
  async getConversationTranscript(conversationId, chatbotIds = []) {
    const idSet = new Set(chatbotIds);
    let conv = null;
    let msgs = [];

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: convData } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (convData) {
          conv = convData;
          const { data: msgData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
          if (msgData) msgs = msgData;
        }
      } catch (err) {
        logger.warn('Supabase get transcript error, fallback to local:', err.message);
      }
    }

    if (!conv) {
      const allConvs = await loadConversations();
      conv = allConvs.find(c => c.id === conversationId);
      if (conv) {
        const allMsgs = await loadMessages();
        msgs = allMsgs
          .filter(m => m.conversation_id === conversationId)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }
    }

    if (!conv) {
      throw new Error(`Conversation "${conversationId}" was not found.`);
    }

    // Tenant check
    if (chatbotIds.length > 0 && !idSet.has(conv.chatbot_id)) {
      throw new Error('Access forbidden: You do not have permission to view this conversation transcript.');
    }

    return {
      ...conv,
      messages: msgs
    };
  },

  /**
   * Updates conversation status (resolved, active, handed_over, closed)
   */
  async updateConversationStatus(conversationId, newStatus, chatbotIds = []) {
    const valid = ['active', 'resolved', 'handed_over', 'closed'];
    if (!valid.includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}". Must be one of: ${valid.join(', ')}`);
    }

    const conv = await this.getConversationById(conversationId);
    if (!conv) {
      throw new Error(`Conversation "${conversationId}" was not found.`);
    }

    if (chatbotIds.length > 0 && !chatbotIds.includes(conv.chatbot_id)) {
      throw new Error('Access forbidden: You do not own this conversation.');
    }

    const updates = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString();
    if (newStatus === 'handed_over') updates.handed_over_at = new Date().toISOString();

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .update(updates)
          .eq('id', conversationId)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        logger.warn('Supabase update status warning:', err.message);
      }
    }

    const allConvs = await loadConversations();
    const idx = allConvs.findIndex(c => c.id === conversationId);
    if (idx !== -1) {
      allConvs[idx] = { ...allConvs[idx], ...updates };
      await saveConversations(allConvs);
      return allConvs[idx];
    }

    return { ...conv, ...updates };
  },

  /**
   * Sends a human agent message into a conversation
   */
  async addAgentReply({ conversationId, agentName = 'Support Agent', content, chatbotIds = [] }) {
    if (!content || !content.trim()) {
      throw new Error('Agent reply message content is required.');
    }

    const conv = await this.getConversationById(conversationId);
    if (!conv) {
      throw new Error(`Conversation "${conversationId}" was not found.`);
    }

    if (chatbotIds.length > 0 && !chatbotIds.includes(conv.chatbot_id)) {
      throw new Error('Access forbidden: You do not own this chatbot.');
    }

    const agentMsg = await this.addMessage(conversationId, 'agent', content.trim(), {
      agentName,
      isHumanReply: true
    });

    // Update conversation assigned agent and keep active
    const updates = {
      assigned_agent_name: agentName,
      status: 'active',
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase
          .from('conversations')
          .update(updates)
          .eq('id', conversationId);
      } catch (err) {
        logger.warn('Supabase agent reply conversation update error:', err.message);
      }
    } else {
      const allConvs = await loadConversations();
      const idx = allConvs.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        allConvs[idx] = { ...allConvs[idx], ...updates };
        await saveConversations(allConvs);
      }
    }

    logger.info(`Human agent "${agentName}" replied to conversation "${conversationId}"`);
    return agentMsg;
  },

  /**
   * Visitor requests human agent support
   */
  async requestHumanHandoff(conversationId, userIdentifier = 'Website Visitor') {
    const conv = await this.getConversationById(conversationId);
    if (!conv) {
      throw new Error(`Conversation "${conversationId}" was not found.`);
    }

    const updates = {
      status: 'handed_over',
      handed_over_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('conversations').update(updates).eq('id', conversationId);
      } catch (err) {
        logger.warn('Supabase handoff status update error:', err.message);
      }
    } else {
      const allConvs = await loadConversations();
      const idx = allConvs.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        allConvs[idx] = { ...allConvs[idx], ...updates };
        await saveConversations(allConvs);
      }
    }

    // Add a system announcement message in conversation
    await this.addMessage(
      conversationId,
      'system',
      'Visitor requested human support. A representative has been notified.',
      { handoff: true }
    );

    // Notify chatbot owner
    const bot = await chatbotService.getChatbotById(conv.chatbot_id);
    if (bot && bot.user_id) {
      await notificationService.createNotification({
        userId: bot.user_id,
        chatbotId: bot.id,
        conversationId,
        type: 'handoff_request',
        title: `Human Support Request: ${bot.name}`,
        message: `${userIdentifier} requested to speak with a human agent on ${bot.name}.`,
        metadata: {
          sessionId: conv.session_id,
          botName: bot.name
        }
      });
      logger.success(`Human handoff notification dispatched to bot owner ${bot.user_id}`);
    }

    return {
      success: true,
      status: 'handed_over',
      message: 'Human support request received. An agent has been notified.'
    };
  },

  /**
   * Retrieves conversations for backward-compatibility with Phase 2/3
   */
  async getConversationsByChatbotId(chatbotId, limit = 20) {
    const result = await this.listConversations({
      chatbotIds: [chatbotId],
      limit,
      page: 1
    });
    return result.conversations;
  }
};

export default conversationService;
