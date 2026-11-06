import express from 'express';
import { billingController } from '../controllers/billingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public: view all subscription plans
router.get('/plans', billingController.getPlans);

// Public: Razorpay Webhook receiver
router.post('/webhook', billingController.handleWebhook);

// Protected: user billing and subscription management
router.get('/details', requireAuth, billingController.getUserBillingDetails);
router.post('/create-order', requireAuth, billingController.createCheckoutOrder);
router.post('/verify-payment', requireAuth, billingController.verifyPayment);
router.post('/cancel-subscription', requireAuth, billingController.cancelSubscription);

export default router;
