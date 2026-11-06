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
const CHATBOTS_FILE = path.join(DATA_DIR, 'chatbots.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed chatbots with public IDs and widget customization
const defaultSeedChatbots = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    public_id: 'bf_live_support101',
    user_id: null, // Public system bot
    name: 'Customer Support Bot',
    description: 'General support and troubleshooting bot for BotFlow website visitors',
    domain: 'botflow.ai',
    mode: 'general',
    system_prompt: 'You are the official customer support AI for BotFlow. Help visitors learn about chatbot creation, document upload, pricing, and embedding.',
    tone: 'friendly',
    primary_color: '#7c3aed',
    business_logo: '',
    position: 'bottom-right',
    theme: 'light',
    window_size: 'standard',
    launcher_icon: 'message',
    allowed_domains: ['localhost', '127.0.0.1', 'botflow.ai'],
    restrict_domains: false,
    welcome_message: 'Hello! 👋 How can I help you today? Ask me anything about building chatbots, uploading docs, website integration, or pricing!',
    fallback_message: 'I am sorry, but I do not have enough information to answer that question. Please contact our support team at support@botflow.ai.',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    public_id: 'bf_live_admissions2',
    user_id: null,
    name: 'University Admissions Guide',
    description: 'Admissions and campus policies chatbot for Horizon University',
    domain: 'campus.edu',
    mode: 'knowledge',
    system_prompt: 'You are the campus admissions helper. Guide prospective students with application dates, scholarship criteria, and syllabus details.',
    tone: 'academic',
    primary_color: '#4f46e5',
    business_logo: '',
    position: 'bottom-right',
    theme: 'light',
    window_size: 'standard',
    launcher_icon: 'bot',
    allowed_domains: ['localhost', '127.0.0.1', 'campus.edu'],
    restrict_domains: false,
    welcome_message: 'Welcome to Horizon University Admissions Assistant! How can I guide your application today?',
    fallback_message: 'That specific admission detail is not listed in our handbook. Please consult the admissions office directly.',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    public_id: 'bf_live_metrocare3',
    user_id: null,
    name: 'MetroCare Patient FAQ',
    description: 'Patient routing and OPD appointment guidelines',
    domain: 'metrocare.org',
    mode: 'knowledge',
    system_prompt: 'You are MetroCare Health Assistant. Provide OPD timings, clinic directions, and pre-op fasting steps safely and empathetically.',
    tone: 'empathetic',
    primary_color: '#059669',
    business_logo: '',
    position: 'bottom-left',
    theme: 'light',
    window_size: 'standard',
    launcher_icon: 'sparkle',
    allowed_domains: ['localhost', '127.0.0.1', 'metrocare.org'],
    restrict_domains: false,
    welcome_message: 'Welcome to MetroCare Health. How can I assist with your clinic visit or appointment questions?',
    fallback_message: 'For urgent medical queries or conditions not covered in our FAQ, please speak directly to our on-call triage staff.',
    status: 'active',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

function generatePublicId() {
  return `bf_${crypto.randomBytes(6).toString('hex')}`;
}

async function loadLocalChatbots() {
  try {
    if (!fs.existsSync(CHATBOTS_FILE)) {
      await fs.promises.writeFile(CHATBOTS_FILE, JSON.stringify(defaultSeedChatbots, null, 2), 'utf-8');
      return [...defaultSeedChatbots];
    }
    const data = await fs.promises.readFile(CHATBOTS_FILE, 'utf-8');
    const parsed = JSON.parse(data || '[]');
    if (parsed.length === 0) {
      return [...defaultSeedChatbots];
    }
    // Ensure all existing chatbots have public_id, customization & domains
    let modified = false;
    for (const b of parsed) {
      if (!b.public_id) {
        b.public_id = generatePublicId();
        modified = true;
      }
      if (!b.allowed_domains) {
        b.allowed_domains = ['localhost', '127.0.0.1'];
        b.restrict_domains = false;
        modified = true;
      }
      if (!b.position) {
        b.position = 'bottom-right';
        b.theme = 'light';
        b.window_size = 'standard';
        b.launcher_icon = 'message';
        modified = true;
      }
    }
    if (modified) {
      await saveLocalChatbots(parsed);
    }
    return parsed;
  } catch (err) {
    logger.error('Failed to load local chatbots:', err.message);
    return [...defaultSeedChatbots];
  }
}

async function saveLocalChatbots(bots) {
  try {
    await fs.promises.writeFile(CHATBOTS_FILE, JSON.stringify(bots, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save chatbots to disk:', err.message);
    throw err;
  }
}

export const chatbotService = {
  /**
   * Alias for listChatbots
   */
  async getChatbots(userId = null) {
    return this.listChatbots(userId);
  },

  /**
   * Retrieves chatbots. If userId is supplied, enforces strict tenant isolation!
   */
  async listChatbots(userId = null) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      let query = supabase.from('chatbots').select('*').order('created_at', { ascending: false });
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;

      if (error) {
        logger.error('Supabase listChatbots error:', error.message);
        throw error;
      }
      return data || [];
    }

    const bots = await loadLocalChatbots();
    if (userId) {
      // User only sees their own chatbots
      return bots.filter(b => b.user_id === userId);
    }
    return bots;
  },

  /**
   * Retrieves a single chatbot by ID (with tenant check if userId supplied)
   */
  async getChatbotById(id, userId = null) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      let query = supabase.from('chatbots').select('*').eq('id', id);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Supabase getChatbotById error:', error.message);
        throw error;
      }
      return data || null;
    }

    const bots = await loadLocalChatbots();
    const bot = bots.find((b) => b.id === id);
    if (!bot) return null;

    if (userId && bot.user_id && bot.user_id !== userId) {
      return null;
    }
    return bot;
  },

  /**
   * Retrieves a chatbot by its public ID or internal UUID (for public widget use)
   */
  async getChatbotByPublicId(publicId) {
    if (!publicId) return null;

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .or(`public_id.eq.${publicId},id.eq.${publicId}`)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.warn('Supabase getChatbotByPublicId error:', error.message);
      }
      if (data) return data;
    }

    const bots = await loadLocalChatbots();
    return bots.find((b) => b.public_id === publicId || b.id === publicId) || null;
  },

  /**
   * Validates whether a request origin / referer domain is allowed to use this chatbot
   */
  validateDomainAllowed(bot, originOrReferer) {
    if (!bot.restrict_domains) {
      return { allowed: true, domain: originOrReferer || 'unrestricted' };
    }

    if (!originOrReferer) {
      // Direct API requests with no Origin/Referer when domain restriction is ON are blocked
      return { allowed: false, domain: 'unknown', reason: 'Direct API requests not permitted when domain restriction is enabled' };
    }

    let hostname = '';
    try {
      const url = new URL(originOrReferer.startsWith('http') ? originOrReferer : `http://${originOrReferer}`);
      hostname = url.hostname.toLowerCase();
    } catch {
      hostname = originOrReferer.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase();
    }

    const allowed = Array.isArray(bot.allowed_domains) ? bot.allowed_domains : [];
    
    // Check direct match or subdomain match
    const isMatch = allowed.some((d) => {
      const allowedClean = d.toLowerCase().trim();
      return hostname === allowedClean || hostname.endsWith(`.${allowedClean}`);
    });

    if (isMatch) {
      return { allowed: true, domain: hostname };
    }

    return {
      allowed: false,
      domain: hostname,
      reason: `Domain "${hostname}" is not authorized for chatbot "${bot.name}"`
    };
  },

  /**
   * Creates a new chatbot for an authenticated user
   */
  async createChatbot(botData, userId = null) {
    const publicId = botData.public_id || generatePublicId();

    const newBot = {
      id: crypto.randomUUID(),
      public_id: publicId,
      user_id: userId || botData.user_id || null,
      name: botData.name,
      description: botData.description || '',
      domain: botData.domain || '',
      mode: botData.mode || 'general',
      system_prompt: botData.system_prompt || 'You are a helpful and polite business chatbot.',
      tone: botData.tone || 'friendly',
      primary_color: botData.primary_color || '#7c3aed',
      business_logo: botData.business_logo || '',
      position: botData.position || 'bottom-right',
      theme: botData.theme || 'light',
      window_size: botData.window_size || 'standard',
      launcher_icon: botData.launcher_icon || 'message',
      allowed_domains: botData.allowed_domains || (botData.domain ? [botData.domain, 'localhost', '127.0.0.1'] : ['localhost', '127.0.0.1']),
      restrict_domains: Boolean(botData.restrict_domains),
      welcome_message: botData.welcome_message || 'Hello! How can I help you today?',
      fallback_message: botData.fallback_message || 'I am sorry, but I do not have enough information to answer that question.',
      status: botData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('chatbots')
        .insert([newBot])
        .select()
        .single();

      if (error) {
        logger.error('Supabase createChatbot error:', error.message);
        throw error;
      }
      return data;
    }

    const bots = await loadLocalChatbots();
    bots.unshift(newBot);
    await saveLocalChatbots(bots);
    return newBot;
  },

  /**
   * Updates widget appearance and customization settings
   */
  async updateCustomization(id, userId, settings) {
    const bot = await this.getChatbotById(id, userId);
    if (!bot) throw new Error('Chatbot not found or not owned by user');

    const updates = {
      name: settings.name !== undefined ? settings.name : bot.name,
      primary_color: settings.primary_color || bot.primary_color,
      business_logo: settings.business_logo !== undefined ? settings.business_logo : bot.business_logo,
      welcome_message: settings.welcome_message || bot.welcome_message,
      fallback_message: settings.fallback_message || bot.fallback_message,
      position: settings.position || bot.position || 'bottom-right',
      theme: settings.theme || bot.theme || 'light',
      window_size: settings.window_size || bot.window_size || 'standard',
      launcher_icon: settings.launcher_icon || bot.launcher_icon || 'message',
      status: settings.status || bot.status || 'active',
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('chatbots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const bots = await loadLocalChatbots();
    const index = bots.findIndex(b => b.id === id);
    if (index !== -1) {
      bots[index] = { ...bots[index], ...updates };
      await saveLocalChatbots(bots);
      return bots[index];
    }
    throw new Error('Chatbot not found');
  },

  /**
   * Domain Management: Adds a domain to chatbot allowed domains
   */
  async addDomain(id, userId, domain) {
    const bot = await this.getChatbotById(id, userId);
    if (!bot) throw new Error('Chatbot not found or not owned by user');

    const cleanDomain = domain.toLowerCase().trim().replace(/https?:\/\//i, '').split('/')[0].split(':')[0];
    if (!cleanDomain) throw new Error('A valid domain name is required');

    const currentDomains = Array.isArray(bot.allowed_domains) ? [...bot.allowed_domains] : [];
    if (!currentDomains.includes(cleanDomain)) {
      currentDomains.push(cleanDomain);
    }

    return await this.updateDomainsList(id, currentDomains);
  },

  /**
   * Domain Management: Removes a domain
   */
  async removeDomain(id, userId, domain) {
    const bot = await this.getChatbotById(id, userId);
    if (!bot) throw new Error('Chatbot not found or not owned by user');

    const cleanDomain = domain.toLowerCase().trim();
    const currentDomains = Array.isArray(bot.allowed_domains) ? [...bot.allowed_domains] : [];
    const updated = currentDomains.filter(d => d.toLowerCase() !== cleanDomain);

    return await this.updateDomainsList(id, updated);
  },

  /**
   * Domain Management: Toggles restrict_domains on/off
   */
  async toggleRestrictDomains(id, userId, restrict) {
    const bot = await this.getChatbotById(id, userId);
    if (!bot) throw new Error('Chatbot not found or not owned by user');

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('chatbots')
        .update({ restrict_domains: Boolean(restrict), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const bots = await loadLocalChatbots();
    const index = bots.findIndex(b => b.id === id);
    if (index !== -1) {
      bots[index].restrict_domains = Boolean(restrict);
      bots[index].updated_at = new Date().toISOString();
      await saveLocalChatbots(bots);
      return bots[index];
    }
    throw new Error('Chatbot not found');
  },

  /**
   * Helper to persist domains list
   */
  async updateDomainsList(id, domains) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('chatbots')
        .update({ allowed_domains: domains, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const bots = await loadLocalChatbots();
    const index = bots.findIndex(b => b.id === id);
    if (index !== -1) {
      bots[index].allowed_domains = domains;
      bots[index].updated_at = new Date().toISOString();
      await saveLocalChatbots(bots);
      return bots[index];
    }
    throw new Error('Chatbot not found');
  },

  /**
   * Deletes a chatbot by ID
   */
  async deleteChatbot(id, userId = null) {
    const bot = await this.getChatbotById(id);
    if (!bot) return false;

    if (userId && bot.user_id && bot.user_id !== userId) {
      throw new Error('Access forbidden: You do not own this chatbot.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      let query = supabase.from('chatbots').delete().eq('id', id);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { error } = await query;

      if (error) {
        logger.error('Supabase deleteChatbot error:', error.message);
        throw error;
      }
      return true;
    }

    const bots = await loadLocalChatbots();
    const index = bots.findIndex((b) => b.id === id);
    if (index !== -1) {
      bots.splice(index, 1);
      await saveLocalChatbots(bots);
      return true;
    }
    return false;
  }
};
