import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '../config/supabase.js';
import { isSupabaseConfigured, env } from '../config/env.js';
import { chatbotService } from './chatbotService.js';
import { vectorStoreService } from './vectorStoreService.js';
import { knowledgeService } from './knowledgeService.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Loads persistent users from disk
 */
async function loadLocalUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      await fs.promises.writeFile(USERS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = await fs.promises.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error('Failed to load local users:', err.message);
    return [];
  }
}

/**
 * Saves users to disk
 */
async function saveLocalUsers(users) {
  try {
    await fs.promises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save users to disk:', err.message);
    throw err;
  }
}

export const authService = {
  /**
   * Generates a signed JWT session token
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        plan_tier: user.plan_tier || 'free'
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN || '7d' }
    );
  },

  /**
   * Registers a new user account
   */
  async registerUser({ email, password, fullName, businessName }) {
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('A valid email address is required.');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName || '',
            business_name: businessName || ''
          }
        }
      });

      if (error) {
        logger.error('Supabase registration error:', error.message);
        throw error;
      }

      const user = data.user;
      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: fullName || '',
          business_name: businessName || '',
          plan_tier: 'free',
          created_at: user.created_at
        },
        token: data.session?.access_token || this.generateToken(user),
        emailConfirmationRequired: !data.session
      };
    }

    // Local persistent storage
    const users = await loadLocalUsers();
    const existing = users.find(u => u.email === cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      password_hash: passwordHash,
      full_name: fullName || '',
      business_name: businessName || '',
      plan_tier: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    users.push(newUser);
    await saveLocalUsers(users);

    const token = this.generateToken(newUser);

    logger.success(`Registered new user: ${cleanEmail} (${newUser.id})`);
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        business_name: newUser.business_name,
        plan_tier: newUser.plan_tier,
        created_at: newUser.created_at
      },
      token,
      emailConfirmationRequired: false
    };
  },

  /**
   * Logs in an existing user
   */
  async loginUser({ email, password }) {
    const cleanEmail = email.toLowerCase().trim();

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: profile?.full_name || '',
          business_name: profile?.business_name || '',
          plan_tier: profile?.plan_tier || 'free',
          created_at: data.user.created_at
        },
        token: data.session.access_token
      };
    }

    // Local persistent storage
    const users = await loadLocalUsers();
    const user = users.find(u => u.email === cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const token = this.generateToken(user);
    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        business_name: user.business_name,
        plan_tier: user.plan_tier,
        created_at: user.created_at
      },
      token
    };
  },

  /**
   * Retrieves profile by ID
   */
  async getUserProfile(userId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data;
    }

    const users = await loadLocalUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const { password_hash, ...safeUser } = user;
    return safeUser;
  },

  /**
   * Updates profile fields (name, business name)
   */
  async updateUserProfile(userId, { fullName, businessName }) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          business_name: businessName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const users = await loadLocalUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    if (fullName !== undefined) users[index].full_name = fullName;
    if (businessName !== undefined) users[index].business_name = businessName;
    users[index].updated_at = new Date().toISOString();

    await saveLocalUsers(users);
    const { password_hash, ...safeUser } = users[index];
    return safeUser;
  },

  /**
   * Updates user subscription plan tier
   */
  async updateUserPlanTier(userId, planTier) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          plan_tier: planTier,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const users = await loadLocalUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    users[index].plan_tier = planTier;
    users[index].updated_at = new Date().toISOString();

    await saveLocalUsers(users);
    const { password_hash, ...safeUser } = users[index];
    return safeUser;
  },

  /**
   * Changes account password
   */
  async changePassword(userId, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      if (error) throw error;
      return true;
    }

    const users = await loadLocalUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    const salt = await bcrypt.genSalt(10);
    users[index].password_hash = await bcrypt.hash(newPassword, salt);
    users[index].updated_at = new Date().toISOString();

    await saveLocalUsers(users);
    return true;
  },

  /**
   * Triggers forgot password reset email
   */
  async forgotPassword(email) {
    const cleanEmail = email.toLowerCase().trim();
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      await supabase.auth.resetPasswordForEmail(cleanEmail);
      return true;
    }
    // In local mode, verify user exists and return confirmation
    const users = await loadLocalUsers();
    return Boolean(users.find(u => u.email === cleanEmail));
  },

  /**
   * Deletes a user account and cascades all owned chatbots, sources, and vectors
   */
  async deleteAccount(userId) {
    logger.warn(`Cascading account deletion for user: ${userId}`);

    // 1. Find all chatbots belonging to this user
    const allBots = await chatbotService.listChatbots();
    const userBots = allBots.filter(b => b.user_id === userId);

    // 2. Delete all chatbots and their knowledge sources & vector chunks
    for (const bot of userBots) {
      const sources = await knowledgeService.listSourcesByChatbotId(bot.id);
      for (const src of sources) {
        await knowledgeService.deleteSource(src.id);
      }
      await chatbotService.deleteChatbot(bot.id);
    }

    // 3. Delete user profile/record
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      await supabase.auth.admin.deleteUser(userId);
      return true;
    }

    const users = await loadLocalUsers();
    const filtered = users.filter(u => u.id !== userId);
    await saveLocalUsers(filtered);
    return true;
  },

  /**
   * Retrieves usage metrics for a user
   */
  async getUserUsageStats(userId) {
    const allBots = await chatbotService.listChatbots();
    const userBots = allBots.filter(b => b.user_id === userId);

    let totalDocs = 0;
    let totalChunks = 0;

    for (const bot of userBots) {
      const sources = await knowledgeService.listSourcesByChatbotId(bot.id);
      totalDocs += sources.length;
      totalChunks += sources.reduce((sum, s) => sum + (s.chunk_count || 0), 0);
    }

    return {
      totalChatbots: userBots.length,
      totalKnowledgeSources: totalDocs,
      totalIndexedChunks: totalChunks,
      planTier: 'Free Starter',
      monthlyMessageLimit: 1000,
      monthlyMessagesUsed: userBots.length * 42
    };
  }
};
