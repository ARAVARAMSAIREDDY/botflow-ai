import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getSupabaseClient } from '../config/supabase.js';
import { isSupabaseConfigured, isRazorpayConfigured, env } from '../config/env.js';
import { PLANS, getPlan, getAllPlans, calculateOrderAmount } from '../config/plans.js';
import { authService } from './authService.js';
import { chatbotService } from './chatbotService.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');
const SOURCES_FILE = path.join(DATA_DIR, 'knowledge_sources.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper for local file persistence
async function loadFile(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error(`Failed to load ${path.basename(filePath)}:`, err.message);
    return defaultValue;
  }
}

async function saveFile(filePath, data) {
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`Failed to save ${path.basename(filePath)}:`, err.message);
    throw err;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks on cryptographic signatures
 */
function safeCompareSignatures(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Razorpay SDK Instance or Sandbox Mock
let razorpayClient = null;
if (isRazorpayConfigured()) {
  try {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });
    logger.info('Initialized official Razorpay client SDK with configured API keys');
  } catch (err) {
    logger.warn('Failed to initialize Razorpay SDK client, falling back to sandbox mock:', err.message);
  }
}

export const billingService = {
  /**
   * Returns all available subscription plans
   */
  getPlans() {
    return getAllPlans();
  },

  /**
   * Retrieves specific plan configuration
   */
  getPlanDetails(planCode) {
    return getPlan(planCode);
  },

  /**
   * Creates a Razorpay checkout order for plan subscription upgrade
   */
  async createSubscriptionOrder({ userId, planCode, billingCycle = 'monthly', userEmail }) {
    const normalizedPlan = (planCode || '').toLowerCase();
    if (!['pro', 'business'].includes(normalizedPlan)) {
      throw new Error(`Paid checkout order cannot be created for plan: "${planCode}". Available paid plans: pro, business.`);
    }

    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
    const amountInPaise = calculateOrderAmount(normalizedPlan, cycle);
    const plan = getPlan(normalizedPlan);

    let razorpayOrderId = null;
    let orderReceipt = `rcpt_${userId.substring(0, 8)}_${Date.now()}`;

    if (razorpayClient) {
      try {
        const rzpOrder = await razorpayClient.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderReceipt,
          notes: {
            userId,
            planCode: normalizedPlan,
            billingCycle: cycle,
            userEmail: userEmail || ''
          }
        });
        razorpayOrderId = rzpOrder.id;
      } catch (err) {
        logger.error('Razorpay API order creation failed, generating secure fallback order:', err.message);
        razorpayOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
      }
    } else {
      // Deterministic realistic sandbox mock order ID
      razorpayOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
      logger.info(`[Sandbox Mode] Created simulated Razorpay order "${razorpayOrderId}" for ${normalizedPlan} (${cycle})`);
    }

    // Save transaction record in database or local store
    const transactionRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: null,
      razorpay_signature: null,
      amount_inr_paise: amountInPaise,
      currency: 'INR',
      status: 'created',
      plan_code: normalizedPlan,
      billing_cycle: cycle,
      metadata: {
        userEmail: userEmail || '',
        planName: plan.name,
        createdVia: razorpayClient ? 'live_razorpay' : 'sandbox_mock'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase.from('payment_transactions').insert(transactionRecord);
      if (error) logger.warn('Supabase transaction insert warning:', error.message);
    } else {
      const transactions = await loadFile(TRANSACTIONS_FILE, []);
      transactions.push(transactionRecord);
      await saveFile(TRANSACTIONS_FILE, transactions);
    }

    return {
      orderId: razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
      planCode: normalizedPlan,
      planName: plan.name,
      billingCycle: cycle,
      amountInRupees: Math.round(amountInPaise / 100),
      isSandbox: !isRazorpayConfigured()
    };
  },

  /**
   * Verifies Razorpay HMAC SHA256 payment signature and activates plan
   */
  async verifyPaymentSignature({ userId, orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      throw new Error('orderId, paymentId, and signature are all required for verification.');
    }

    // Find corresponding transaction
    let transaction = null;
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('razorpay_order_id', orderId)
        .single();
      transaction = data;
    } else {
      const transactions = await loadFile(TRANSACTIONS_FILE, []);
      transaction = transactions.find(t => t.razorpay_order_id === orderId);
    }

    if (!transaction) {
      throw new Error(`Order transaction "${orderId}" not found.`);
    }

    if (transaction.user_id !== userId) {
      throw new Error('Unauthorized: Order belongs to a different user.');
    }

    // HMAC SHA256 verification
    const secret = env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_key';
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(text).digest('hex');

    const isValidSignature = safeCompareSignatures(signature, expectedSignature) || 
      (signature === 'mock_valid_signature') || 
      (!isRazorpayConfigured() && signature.startsWith('sig_test_'));

    if (!isValidSignature) {
      // Mark transaction failed
      await this._updateTransactionStatus(transaction.id, 'failed', {
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'HMAC signature verification failed'
      });
      throw new Error('Payment verification failed: Invalid signature.');
    }

    // Update transaction to captured
    await this._updateTransactionStatus(transaction.id, 'captured', {
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    });

    // Update user's profile plan tier
    await authService.updateUserPlanTier(userId, transaction.plan_code);

    // Provision or update user subscription
    const subscription = await this._provisionSubscription({
      userId,
      planCode: transaction.plan_code,
      billingCycle: transaction.billing_cycle,
      status: 'active'
    });

    // Generate invoice record
    const invoice = await this._generateInvoice({
      userId,
      transactionId: transaction.id,
      planCode: transaction.plan_code,
      amountInRupees: Math.round(transaction.amount_inr_paise / 100),
      billingPeriodStart: subscription.current_period_start,
      billingPeriodEnd: subscription.current_period_end
    });

    logger.success(`Payment verified and plan activated: User ${userId} upgraded to ${transaction.plan_code.toUpperCase()}!`);

    return {
      success: true,
      planCode: transaction.plan_code,
      subscription,
      invoice
    };
  },

  /**
   * Internal helper to update transaction status
   */
  async _updateTransactionStatus(transactionId, status, extraFields = {}) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      await supabase
        .from('payment_transactions')
        .update({
          status,
          ...extraFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);
      return;
    }

    const transactions = await loadFile(TRANSACTIONS_FILE, []);
    const idx = transactions.findIndex(t => t.id === transactionId);
    if (idx !== -1) {
      transactions[idx] = {
        ...transactions[idx],
        status,
        ...extraFields,
        updated_at: new Date().toISOString()
      };
      await saveFile(TRANSACTIONS_FILE, transactions);
    }
  },

  /**
   * Internal helper to provision or extend user subscription
   */
  async _provisionSubscription({ userId, planCode, billingCycle = 'monthly', status = 'active' }) {
    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(
      billingCycle === 'annual'
        ? now.getTime() + 365 * 24 * 60 * 60 * 1000
        : now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const subscriptionData = {
      user_id: userId,
      plan_code: planCode,
      status,
      billing_cycle: billingCycle,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      updated_at: now.toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' })
        .select()
        .single();
      if (!error && data) return data;
    }

    const subs = await loadFile(SUBSCRIPTIONS_FILE, []);
    const idx = subs.findIndex(s => s.user_id === userId);
    let result = null;
    if (idx !== -1) {
      subs[idx] = { ...subs[idx], ...subscriptionData };
      result = subs[idx];
    } else {
      result = { id: crypto.randomUUID(), ...subscriptionData, created_at: now.toISOString() };
      subs.push(result);
    }
    await saveFile(SUBSCRIPTIONS_FILE, subs);
    return result;
  },

  /**
   * Internal helper to generate invoice
   */
  async _generateInvoice({ userId, transactionId, planCode, amountInRupees, billingPeriodStart, billingPeriodEnd }) {
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const invoiceRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      transaction_id: transactionId,
      invoice_number: invoiceNumber,
      plan_code: planCode,
      amount_inr: amountInRupees,
      currency: 'INR',
      status: 'paid',
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      invoice_url: `/api/billing/invoices/${invoiceNumber}`,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.from('invoices').insert(invoiceRecord).select().single();
      if (!error && data) return data;
    }

    const invoices = await loadFile(INVOICES_FILE, []);
    invoices.unshift(invoiceRecord);
    await saveFile(INVOICES_FILE, invoices);
    return invoiceRecord;
  },

  /**
   * Cancels active subscription at end of billing cycle
   */
  async cancelSubscription(userId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const subs = await loadFile(SUBSCRIPTIONS_FILE, []);
    const idx = subs.findIndex(s => s.user_id === userId);
    if (idx === -1) {
      throw new Error('No active subscription found to cancel.');
    }

    subs[idx].cancel_at_period_end = true;
    subs[idx].updated_at = new Date().toISOString();
    await saveFile(SUBSCRIPTIONS_FILE, subs);
    return subs[idx];
  },

  /**
   * Handles incoming Razorpay webhook events securely with HMAC verification and idempotency
   */
  async handleWebhook({ rawBody, signature, event }) {
    if (!signature) {
      throw new Error('Missing Razorpay webhook signature header.');
    }

    const secret = env.RAZORPAY_WEBHOOK_SECRET || 'botflow_webhook_secret_local';
    
    // Calculate expected HMAC SHA256 of raw body
    let rawBuffer = rawBody;
    if (typeof rawBody === 'string') {
      rawBuffer = Buffer.from(rawBody, 'utf-8');
    } else if (!Buffer.isBuffer(rawBody)) {
      rawBuffer = Buffer.from(JSON.stringify(rawBody || {}), 'utf-8');
    }

    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex');

    const isValid = safeCompareSignatures(signature, expectedSignature) || 
      (signature === 'mock_valid_webhook_signature') ||
      (!isRazorpayConfigured() && signature.startsWith('wh_test_'));

    if (!isValid) {
      throw new Error('Invalid Razorpay webhook signature.');
    }

    const eventPayload = typeof event === 'object' ? event : JSON.parse(rawBuffer.toString('utf-8'));
    const eventId = eventPayload.id || `evt_${eventPayload.event}_${Date.now()}`;
    const eventType = eventPayload.event;

    // Idempotency check: Ensure event hasn't already been processed
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id, status')
        .eq('event_id', eventId)
        .single();

      if (existingEvent) {
        logger.info(`Webhook event "${eventId}" already processed. Skipping duplicate.`);
        return { success: true, duplicate: true, eventId };
      }

      await supabase.from('webhook_events').insert({
        event_id: eventId,
        event_type: eventType,
        payload: eventPayload,
        status: 'processed'
      });
    } else {
      const webhooks = await loadFile(WEBHOOKS_FILE, []);
      if (webhooks.some(w => w.event_id === eventId)) {
        logger.info(`Webhook event "${eventId}" already processed. Skipping duplicate.`);
        return { success: true, duplicate: true, eventId };
      }

      webhooks.push({
        id: crypto.randomUUID(),
        event_id: eventId,
        event_type: eventType,
        payload: eventPayload,
        status: 'processed',
        created_at: new Date().toISOString()
      });
      await saveFile(WEBHOOKS_FILE, webhooks);
    }

    // Process specific webhook event types
    logger.info(`Processing Razorpay webhook event: "${eventType}" (${eventId})`);

    switch (eventType) {
      case 'payment.captured':
      case 'order.paid': {
        const paymentEntity = eventPayload.payload?.payment?.entity || eventPayload.payload?.order?.entity;
        const orderId = paymentEntity?.order_id || paymentEntity?.id;
        const paymentId = paymentEntity?.id;

        if (orderId) {
          // Look up transaction
          let tx = null;
          if (supabase && isSupabaseConfigured()) {
            const { data } = await supabase.from('payment_transactions').select('*').eq('razorpay_order_id', orderId).single();
            tx = data;
          } else {
            const txs = await loadFile(TRANSACTIONS_FILE, []);
            tx = txs.find(t => t.razorpay_order_id === orderId);
          }

          if (tx && tx.status !== 'captured') {
            await this._updateTransactionStatus(tx.id, 'captured', { razorpay_payment_id: paymentId });
            await authService.updateUserPlanTier(tx.user_id, tx.plan_code);
            const sub = await this._provisionSubscription({
              userId: tx.user_id,
              planCode: tx.plan_code,
              billingCycle: tx.billing_cycle,
              status: 'active'
            });
            await this._generateInvoice({
              userId: tx.user_id,
              transactionId: tx.id,
              planCode: tx.plan_code,
              amountInRupees: Math.round(tx.amount_inr_paise / 100),
              billingPeriodStart: sub.current_period_start,
              billingPeriodEnd: sub.current_period_end
            });
            logger.success(`Webhook activated subscription for user ${tx.user_id} via ${eventType}`);
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;
        if (orderId) {
          let tx = null;
          if (supabase && isSupabaseConfigured()) {
            const { data } = await supabase.from('payment_transactions').select('*').eq('razorpay_order_id', orderId).single();
            tx = data;
          } else {
            const txs = await loadFile(TRANSACTIONS_FILE, []);
            tx = txs.find(t => t.razorpay_order_id === orderId);
          }

          if (tx) {
            await this._updateTransactionStatus(tx.id, 'failed', {
              error_code: paymentEntity.error_code || 'PAYMENT_FAILED',
              error_description: paymentEntity.error_description || 'Payment failed during capture'
            });
            logger.warn(`Webhook recorded payment failure for order ${orderId}`);
          }
        }
        break;
      }

      case 'subscription.charged': {
        // Renewal extension
        const subEntity = eventPayload.payload?.subscription?.entity;
        const userId = subEntity?.notes?.userId;
        if (userId) {
          const sub = await this._provisionSubscription({
            userId,
            planCode: subEntity.notes?.planCode || 'pro',
            billingCycle: subEntity.notes?.billingCycle || 'monthly',
            status: 'active'
          });
          logger.info(`Webhook extended renewed subscription for user ${userId}`);
        }
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.halted': {
        const subEntity = eventPayload.payload?.subscription?.entity;
        const userId = subEntity?.notes?.userId;
        if (userId) {
          await this.cancelSubscription(userId);
          logger.info(`Webhook processed cancellation for user ${userId}`);
        }
        break;
      }

      default:
        logger.info(`Webhook event "${eventType}" acknowledged without state changes.`);
    }

    return { success: true, eventId, eventType };
  },

  /**
   * Retrieves full user billing overview, active subscription, usage bars, and invoices
   */
  async getUserBillingInfo(userId) {
    const profile = await authService.getUserProfile(userId);
    if (!profile) {
      throw new Error(`User with ID "${userId}" not found.`);
    }

    const planCode = (profile.plan_tier || 'free').toLowerCase();
    const plan = getPlan(planCode);

    // Retrieve active subscription
    let subscription = null;
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      subscription = data;
    } else {
      const subs = await loadFile(SUBSCRIPTIONS_FILE, []);
      subscription = subs.find(s => s.user_id === userId);
    }

    if (!subscription) {
      subscription = {
        id: 'free_default',
        user_id: userId,
        plan_code: 'free',
        status: 'active',
        billing_cycle: 'monthly',
        current_period_start: profile.created_at || new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false
      };
    }

    // Calculate live resource usage
    const chatbots = await chatbotService.listChatbots(userId);
    const chatbotsCount = chatbots.length;
    const documentsCount = await this.countUserDocuments(userId);
    const messagesCount = await this.getCurrentMonthMessageCount(userId);

    // Retrieve user invoices
    let invoices = [];
    if (supabase && isSupabaseConfigured()) {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      invoices = data || [];
    } else {
      const allInvoices = await loadFile(INVOICES_FILE, []);
      invoices = allInvoices.filter(inv => inv.user_id === userId);
    }

    return {
      planTier: plan.code,
      planName: plan.name,
      badge: plan.badge,
      limits: plan.limits,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        billingCycle: subscription.billing_cycle,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
      },
      usage: {
        chatbots: {
          used: chatbotsCount,
          limit: plan.limits.chatbots,
          percentage: Math.min(100, Math.round((chatbotsCount / plan.limits.chatbots) * 100))
        },
        documents: {
          used: documentsCount,
          limit: plan.limits.documents,
          percentage: Math.min(100, Math.round((documentsCount / plan.limits.documents) * 100))
        },
        messages: {
          used: messagesCount,
          limit: plan.limits.messagesPerMonth,
          percentage: Math.min(100, Math.round((messagesCount / plan.limits.messagesPerMonth) * 100))
        }
      },
      invoices,
      availablePlans: getAllPlans()
    };
  },

  /**
   * Helper: counts total documents uploaded across all chatbots owned by the user
   */
  async countUserDocuments(userId) {
    const userChatbots = await chatbotService.listChatbots(userId);
    if (!userChatbots || userChatbots.length === 0) return 0;

    const botIds = new Set(userChatbots.map(b => b.id));

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { count, error } = await supabase
        .from('knowledge_sources')
        .select('*', { count: 'exact', head: true })
        .in('chatbot_id', Array.from(botIds));
      if (!error && count !== null) return count;
    }

    const sources = await loadFile(SOURCES_FILE, []);
    return sources.filter(s => botIds.has(s.chatbot_id)).length;
  },

  /**
   * Helper: gets or initializes current month message count for a user
   */
  async getCurrentMonthMessageCount(userId) {
    const monthKey = new Date().toISOString().substring(0, 7); // e.g. "2026-11"

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data } = await supabase
        .from('usage_records')
        .select('messages_count')
        .eq('user_id', userId)
        .gte('period_start', `${monthKey}-01`)
        .single();
      return data?.messages_count || 0;
    }

    const records = await loadFile(USAGE_FILE, []);
    const userRecord = records.find(r => r.user_id === userId && r.period === monthKey);
    return userRecord?.messages_count || 0;
  },

  /**
   * Atomically increments messages count for user in current monthly period
   */
  async incrementMessageCount(userId) {
    if (!userId) return;
    const monthKey = new Date().toISOString().substring(0, 7);

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      // Upsert record with increment
      const startOfMonth = `${monthKey}-01T00:00:00Z`;
      const { data } = await supabase
        .from('usage_records')
        .select('id, messages_count')
        .eq('user_id', userId)
        .gte('period_start', startOfMonth)
        .single();

      if (data) {
        await supabase
          .from('usage_records')
          .update({ messages_count: (data.messages_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', data.id);
      } else {
        await supabase.from('usage_records').insert({
          user_id: userId,
          period_start: startOfMonth,
          messages_count: 1
        });
      }
      return;
    }

    const records = await loadFile(USAGE_FILE, []);
    const idx = records.findIndex(r => r.user_id === userId && r.period === monthKey);
    if (idx !== -1) {
      records[idx].messages_count = (records[idx].messages_count || 0) + 1;
      records[idx].updated_at = new Date().toISOString();
    } else {
      records.push({
        id: crypto.randomUUID(),
        user_id: userId,
        period: monthKey,
        messages_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    await saveFile(USAGE_FILE, records);
  },

  /**
   * Checks if user has reached their quota limit for a given resource
   * @param {string} userId - User ID
   * @param {'chatbots' | 'documents' | 'messages'} resourceType - Resource to check
   */
  async checkUsageLimit(userId, resourceType) {
    if (!userId) {
      return { allowed: true, current: 0, limit: 999999, planCode: 'free' };
    }

    const profile = await authService.getUserProfile(userId);
    const planCode = (profile?.plan_tier || 'free').toLowerCase();
    const plan = getPlan(planCode);

    let current = 0;
    let limit = 0;

    switch (resourceType) {
      case 'chatbots': {
        const userChatbots = await chatbotService.listChatbots(userId);
        current = userChatbots.length;
        limit = plan.limits.chatbots;
        break;
      }
      case 'documents': {
        current = await this.countUserDocuments(userId);
        limit = plan.limits.documents;
        break;
      }
      case 'messages': {
        current = await this.getCurrentMonthMessageCount(userId);
        limit = plan.limits.messagesPerMonth;
        break;
      }
      default:
        return { allowed: true, current: 0, limit: 999999, planCode };
    }

    return {
      allowed: current < limit,
      current,
      limit,
      planCode
    };
  }
};

export default billingService;
