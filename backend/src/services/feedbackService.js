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
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function loadFeedback() {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) {
      await fs.promises.writeFile(FEEDBACK_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = await fs.promises.readFile(FEEDBACK_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error('Failed to load local feedback:', err.message);
    return [];
  }
}

async function saveFeedback(items) {
  try {
    await fs.promises.writeFile(FEEDBACK_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save feedback to disk:', err.message);
  }
}

export const feedbackService = {
  /**
   * Submits visitor feedback for a conversation
   */
  async submitFeedback({ conversationId, chatbotId, rating, comment = '', thumbsUp = null, userIdentifier = 'Anonymous Visitor' }) {
    const cleanRating = Math.max(1, Math.min(5, parseInt(rating, 10) || (thumbsUp ? 5 : 1)));
    const isThumbsUp = thumbsUp !== null ? Boolean(thumbsUp) : cleanRating >= 4;

    const feedbackRecord = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      chatbot_id: chatbotId,
      rating: cleanRating,
      thumbs_up: isThumbsUp,
      comment: (comment || '').trim().slice(0, 1000),
      user_identifier: userIdentifier,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('customer_feedback')
          .insert(feedbackRecord)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        logger.warn('Supabase feedback insert error, using local fallback:', err.message);
      }
    }

    const items = await loadFeedback();
    items.unshift(feedbackRecord);
    await saveFeedback(items);
    return feedbackRecord;
  },

  /**
   * Retrieves feedback statistics across a set of chatbot IDs
   */
  async getFeedbackStats(chatbotIds = []) {
    const idSet = new Set(chatbotIds);
    let items = [];

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        let query = supabase.from('customer_feedback').select('*');
        if (chatbotIds.length > 0) {
          query = query.in('chatbot_id', chatbotIds);
        }
        const { data } = await query;
        if (data) items = data;
      } catch (err) {
        logger.warn('Supabase feedback stats fetch error:', err.message);
      }
    }

    if (items.length === 0) {
      const all = await loadFeedback();
      items = chatbotIds.length > 0 ? all.filter(f => idSet.has(f.chatbot_id)) : all;
    }

    const totalRatings = items.length;
    if (totalRatings === 0) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        positiveRatio: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    let sumRating = 0;
    let thumbsUp = 0;
    let thumbsDown = 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const item of items) {
      const r = Math.max(1, Math.min(5, item.rating));
      sumRating += r;
      distribution[r] = (distribution[r] || 0) + 1;
      if (item.thumbs_up) thumbsUp++;
      else thumbsDown++;
    }

    return {
      totalFeedback: totalRatings,
      averageRating: Math.round((sumRating / totalRatings) * 10) / 10,
      thumbsUpCount: thumbsUp,
      thumbsDownCount: thumbsDown,
      positiveRatio: Math.round((thumbsUp / totalRatings) * 100),
      ratingDistribution: distribution
    };
  },

  /**
   * Lists customer feedback items with pagination
   */
  async listFeedback({ chatbotIds = [], limit = 50, page = 1, minRating = null, maxRating = null } = {}) {
    const idSet = new Set(chatbotIds);
    let items = [];

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('customer_feedback')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (chatbotIds.length > 0) {
          query = query.in('chatbot_id', chatbotIds);
        }
        if (minRating !== null) query = query.gte('rating', minRating);
        if (maxRating !== null) query = query.lte('rating', maxRating);

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data, count, error } = await query.range(from, to);

        if (!error && data) {
          return {
            feedback: data,
            totalCount: count || 0,
            page,
            limit
          };
        }
      } catch (err) {
        logger.warn('Supabase feedback list error:', err.message);
      }
    }

    const all = await loadFeedback();
    let filtered = chatbotIds.length > 0 ? all.filter(f => idSet.has(f.chatbot_id)) : all;

    if (minRating !== null) filtered = filtered.filter(f => f.rating >= minRating);
    if (maxRating !== null) filtered = filtered.filter(f => f.rating <= maxRating);

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      feedback: paginated,
      totalCount: filtered.length,
      page,
      limit
    };
  }
};

export default feedbackService;
