import { billingService } from '../services/billingService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const billingController = {
  /**
   * GET /api/billing/plans
   * Returns all available subscription plans and their tier limits
   */
  async getPlans(req, res, next) {
    try {
      const plans = billingService.getPlans();
      return successResponse(res, plans, 'Subscription plans retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/billing/details
   * Returns current user's plan tier, limits, usage metrics, and invoices
   */
  async getUserBillingDetails(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const billingInfo = await billingService.getUserBillingInfo(userId);
      return successResponse(res, billingInfo, 'Billing details retrieved');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/billing/create-order
   * Initializes Razorpay checkout order for plan upgrade
   */
  async createCheckoutOrder(req, res, next) {
    try {
      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const { planCode, billingCycle = 'monthly' } = req.body;

      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      if (!planCode) {
        return errorResponse(res, 'The "planCode" parameter is required.', 400);
      }

      const order = await billingService.createSubscriptionOrder({
        userId,
        planCode,
        billingCycle,
        userEmail
      });

      return successResponse(res, order, 'Razorpay order created successfully', 201);
    } catch (err) {
      logger.error('Error creating checkout order:', err.message);
      return errorResponse(res, err.message, 400);
    }
  },

  /**
   * POST /api/billing/verify-payment
   * Verifies Razorpay HMAC SHA256 payment signature and updates user's plan
   */
  async verifyPayment(req, res, next) {
    try {
      const userId = req.user?.id;
      const { orderId, paymentId, signature } = req.body;

      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      if (!orderId || !paymentId || !signature) {
        return errorResponse(res, 'Missing required payment verification fields: orderId, paymentId, and signature.', 400);
      }

      const result = await billingService.verifyPaymentSignature({
        userId,
        orderId,
        paymentId,
        signature
      });

      return successResponse(res, result, 'Payment verified successfully and subscription activated!');
    } catch (err) {
      logger.error('Payment signature verification failed:', err.message);
      return errorResponse(res, err.message, 400);
    }
  },

  /**
   * POST /api/billing/cancel-subscription
   * Cancels active subscription at the end of the current billing cycle
   */
  async cancelSubscription(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required.', 401);
      }

      const updatedSubscription = await billingService.cancelSubscription(userId);
      return successResponse(res, {
        message: 'Your subscription has been scheduled for cancellation. You will maintain access until the end of the billing period.',
        subscription: updatedSubscription
      }, 'Subscription cancellation scheduled');
    } catch (err) {
      logger.error('Error cancelling subscription:', err.message);
      return errorResponse(res, err.message, 400);
    }
  },

  /**
   * POST /api/billing/webhook
   * Webhook listener for asynchronous Razorpay events (payment.captured, subscription.renewed, etc.)
   */
  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      if (!signature) {
        logger.warn('Incoming webhook rejected: missing x-razorpay-signature header');
        return errorResponse(res, 'Missing x-razorpay-signature header.', 400);
      }

      // Use raw body buffer captured by verify handler or fallback to request body
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const result = await billingService.handleWebhook({
        rawBody,
        signature,
        event: req.body
      });

      return successResponse(res, result, 'Webhook event processed');
    } catch (err) {
      logger.error('Razorpay webhook error:', err.message);
      return errorResponse(res, err.message, 400);
    }
  }
};
