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
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function loadNotifications() {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      await fs.promises.writeFile(NOTIFICATIONS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = await fs.promises.readFile(NOTIFICATIONS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error('Failed to load local notifications:', err.message);
    return [];
  }
}

async function saveNotifications(notifications) {
  try {
    await fs.promises.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save local notifications:', err.message);
  }
}

export const notificationService = {
  /**
   * Creates a notification for a user
   */
  async createNotification({ userId, chatbotId = null, conversationId = null, type, title, message, metadata = {} }) {
    if (!userId) return null;

    const notificationRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      chatbot_id: chatbotId,
      conversation_id: conversationId,
      type,
      title,
      message,
      is_read: false,
      metadata,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .insert(notificationRecord)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        logger.warn('Supabase notification insert warning, using local file:', err.message);
      }
    }

    const items = await loadNotifications();
    items.unshift(notificationRecord);
    // Keep at most 1,000 notifications locally
    if (items.length > 1000) {
      items.splice(1000);
    }
    await saveNotifications(items);
    return notificationRecord;
  },

  /**
   * Retrieves notifications for a user with unread count
   */
  async getUserNotifications(userId, { unreadOnly = false, limit = 50, page = 1 } = {}) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (unreadOnly) {
          query = query.eq('is_read', false);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data, count, error } = await query.range(from, to);

        if (!error && data) {
          const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

          return {
            notifications: data,
            unreadCount: unreadCount || 0,
            totalCount: count || 0,
            page,
            limit
          };
        }
      } catch (err) {
        logger.warn('Supabase notifications fetch error:', err.message);
      }
    }

    const items = await loadNotifications();
    const userItems = items.filter(n => n.user_id === userId);
    const unreadCount = userItems.filter(n => !n.is_read).length;

    let filtered = userItems;
    if (unreadOnly) {
      filtered = filtered.filter(n => !n.is_read);
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      notifications: paginated,
      unreadCount,
      totalCount: filtered.length,
      page,
      limit
    };
  },

  /**
   * Marks a single notification as read
   */
  async markAsRead(notificationId, userId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', userId);
        return true;
      } catch (err) {
        logger.warn('Supabase mark notification read error:', err.message);
      }
    }

    const items = await loadNotifications();
    const item = items.find(n => n.id === notificationId && n.user_id === userId);
    if (item) {
      item.is_read = true;
      await saveNotifications(items);
      return true;
    }
    return false;
  },

  /**
   * Marks all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false);
        return true;
      } catch (err) {
        logger.warn('Supabase mark all notifications read error:', err.message);
      }
    }

    const items = await loadNotifications();
    let modified = false;
    for (const item of items) {
      if (item.user_id === userId && !item.is_read) {
        item.is_read = true;
        modified = true;
      }
    }
    if (modified) {
      await saveNotifications(items);
    }
    return true;
  }
};

export default notificationService;
