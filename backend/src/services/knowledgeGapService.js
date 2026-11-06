import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getSupabaseClient } from '../config/supabase.js';
import { isSupabaseConfigured } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const GAPS_FILE = path.join(DATA_DIR, 'knowledge_gaps.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function loadGaps() {
  try {
    if (!fs.existsSync(GAPS_FILE)) {
      await fs.promises.writeFile(GAPS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = await fs.promises.readFile(GAPS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error('Failed to load local knowledge gaps:', err.message);
    return [];
  }
}

async function saveGaps(items) {
  try {
    await fs.promises.writeFile(GAPS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save knowledge gaps:', err.message);
  }
}

/**
 * Heuristic to suggest relevant document or policy topic from question text
 */
function inferSuggestedTopic(question = '') {
  const q = question.toLowerCase();
  if (q.includes('price') || q.includes('cost') || q.includes('rate') || q.includes('fee') || q.includes('subscription')) {
    return 'Pricing & Billing FAQ document';
  }
  if (q.includes('refund') || q.includes('cancel') || q.includes('return') || q.includes('money back')) {
    return 'Refund & Cancellation Policy document';
  }
  if (q.includes('api') || q.includes('webhook') || q.includes('sdk') || q.includes('developer') || q.includes('integration')) {
    return 'Developer & API Integration Guide';
  }
  if (q.includes('admissions') || q.includes('application') || q.includes('course') || q.includes('tuition')) {
    return 'Academic Admissions & Course Catalog';
  }
  if (q.includes('doctor') || q.includes('appointment') || q.includes('patient') || q.includes('hospital') || q.includes('clinic')) {
    return 'Clinical Protocols & Inpatient Services Handbook';
  }
  if (q.includes('hours') || q.includes('location') || q.includes('address') || q.includes('contact') || q.includes('phone')) {
    return 'Business Directory & Operating Hours';
  }
  if (q.includes('shipping') || q.includes('delivery') || q.includes('tracking')) {
    return 'Shipping & Fulfillment Policies';
  }
  return 'General Knowledge Base & Product Overview';
}

export const knowledgeGapService = {
  /**
   * Records or increments an unanswered visitor question
   */
  async recordKnowledgeGap({ chatbotId, question, suggestedTopic = null }) {
    if (!chatbotId || !question || typeof question !== 'string') return null;

    const cleanQuestion = question.trim().slice(0, 300);
    if (cleanQuestion.length < 4) return null;

    const topic = suggestedTopic || inferSuggestedTopic(cleanQuestion);

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        // Check if exists
        const { data: existing } = await supabase
          .from('knowledge_gaps')
          .select('id, frequency')
          .eq('chatbot_id', chatbotId)
          .eq('question', cleanQuestion)
          .single();

        if (existing) {
          const { data, error } = await supabase
            .from('knowledge_gaps')
            .update({
              frequency: (existing.frequency || 1) + 1,
              last_asked_at: new Date().toISOString(),
              status: 'open',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();
          if (!error && data) return data;
        } else {
          const { data, error } = await supabase
            .from('knowledge_gaps')
            .insert({
              chatbot_id: chatbotId,
              question: cleanQuestion,
              frequency: 1,
              suggested_topic: topic,
              status: 'open'
            })
            .select()
            .single();
          if (!error && data) return data;
        }
      } catch (err) {
        logger.warn('Supabase knowledge gap error, fallback to local file:', err.message);
      }
    }

    const items = await loadGaps();
    const existingIdx = items.findIndex(
      g => g.chatbot_id === chatbotId && g.question.toLowerCase() === cleanQuestion.toLowerCase()
    );

    if (existingIdx !== -1) {
      items[existingIdx].frequency = (items[existingIdx].frequency || 1) + 1;
      items[existingIdx].last_asked_at = new Date().toISOString();
      items[existingIdx].status = 'open';
      items[existingIdx].updated_at = new Date().toISOString();
      await saveGaps(items);
      return items[existingIdx];
    }

    const newRecord = {
      id: crypto.randomUUID(),
      chatbot_id: chatbotId,
      question: cleanQuestion,
      frequency: 1,
      suggested_topic: topic,
      status: 'open',
      last_asked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    items.unshift(newRecord);
    await saveGaps(items);
    return newRecord;
  },

  /**
   * Retrieves knowledge gaps across user chatbots with optional status filter
   */
  async listKnowledgeGaps({ chatbotIds = [], status = null, limit = 50, page = 1 } = {}) {
    const idSet = new Set(chatbotIds);
    let items = [];

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('knowledge_gaps')
          .select('*', { count: 'exact' })
          .order('frequency', { ascending: false });

        if (chatbotIds.length > 0) {
          query = query.in('chatbot_id', chatbotIds);
        }
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data, count, error } = await query.range(from, to);

        if (!error && data) {
          return {
            gaps: data,
            totalCount: count || 0,
            page,
            limit
          };
        }
      } catch (err) {
        logger.warn('Supabase list knowledge gaps error:', err.message);
      }
    }

    const all = await loadGaps();
    let filtered = chatbotIds.length > 0 ? all.filter(g => idSet.has(g.chatbot_id)) : all;
    if (status && status !== 'all') {
      filtered = filtered.filter(g => g.status === status);
    }

    filtered.sort((a, b) => (b.frequency || 1) - (a.frequency || 1));

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      gaps: paginated,
      totalCount: filtered.length,
      page,
      limit
    };
  },

  /**
   * Updates status of a knowledge gap (e.g. marked as 'addressed' or 'ignored')
   */
  async updateKnowledgeGapStatus(gapId, status) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('knowledge_gaps')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', gapId)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        logger.warn('Supabase update gap error:', err.message);
      }
    }

    const items = await loadGaps();
    const idx = items.findIndex(g => g.id === gapId);
    if (idx !== -1) {
      items[idx].status = status;
      items[idx].updated_at = new Date().toISOString();
      await saveGaps(items);
      return items[idx];
    }
    return null;
  }
};

export default knowledgeGapService;
