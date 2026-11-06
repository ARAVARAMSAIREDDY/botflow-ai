/**
 * BotFlow AI - Subscription Plans and Limits Configuration
 * Prices are in Indian Rupees (INR)
 */
export const PLANS = {
  free: {
    code: 'free',
    name: 'Free Starter',
    badge: 'Free Forever',
    description: 'Perfect for trying out BotFlow AI on personal projects and small sites.',
    prices: {
      monthly: 0,
      annual: 0
    },
    limits: {
      chatbots: 1,
      messagesPerMonth: 100,
      documents: 3
    },
    features: [
      '1 Custom AI Chatbot',
      '100 messages / month',
      '3 Knowledge documents or URLs',
      'Standard RAG semantic search',
      'Basic BotFlow branding',
      'Community support'
    ],
    highlight: false,
    isActive: true
  },

  pro: {
    code: 'pro',
    name: 'Professional',
    badge: 'Most Popular',
    description: 'Ideal for growing businesses, clinics, and startups requiring custom branding.',
    prices: {
      monthly: 999, // ₹999/mo
      annual: 9990  // ₹9,990/yr (~₹832/mo)
    },
    limits: {
      chatbots: 5,
      messagesPerMonth: 5000,
      documents: 25
    },
    features: [
      '5 Custom AI Chatbots',
      '5,000 messages / month',
      '25 Knowledge documents or URLs',
      'Remove BotFlow branding',
      'Advanced visitor analytics & FAQs',
      'Custom color & avatar styling',
      'Email support (24h response)'
    ],
    highlight: true,
    isActive: true
  },

  business: {
    code: 'business',
    name: 'Business',
    badge: 'Full Power',
    description: 'For high-traffic platforms, hospitals, and universities with heavy volume.',
    prices: {
      monthly: 2499, // ₹2,499/mo
      annual: 24990  // ₹24,990/yr (~₹2,082/mo)
    },
    limits: {
      chatbots: 20,
      messagesPerMonth: 25000,
      documents: 100
    },
    features: [
      '20 Custom AI Chatbots',
      '25,000 messages / month',
      '100 Knowledge documents or URLs',
      'Custom branding & white-label',
      'Full conversation exports & transcripts',
      'Strict domain whitelisting & RLS',
      'Dedicated priority SLA support'
    ],
    highlight: false,
    isActive: true
  }
};

/**
 * Retrieves plan definition by plan code
 */
export function getPlan(planCode = 'free') {
  const normalized = (planCode || 'free').toLowerCase();
  return PLANS[normalized] || PLANS.free;
}

/**
 * Returns all active plans for public display
 */
export function getAllPlans() {
  return Object.values(PLANS).filter(p => p.isActive);
}

/**
 * Calculates order price in paise (INR * 100) for Razorpay Order creation
 */
export function calculateOrderAmount(planCode, billingCycle = 'monthly') {
  const plan = getPlan(planCode);
  if (plan.code === 'free') return 0;

  const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
  const priceInRupees = plan.prices[cycle];
  return priceInRupees * 100; // Razorpay amounts are in the smallest currency unit (paise)
}
