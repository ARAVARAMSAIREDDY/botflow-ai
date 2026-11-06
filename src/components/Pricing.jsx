import React, { useState } from 'react';
import { Check, Sparkles, Shield, Zap, ArrowRight, RotateCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  createBillingOrder, 
  verifyBillingPayment, 
  loadRazorpayCheckoutScript 
} from '../services/api';

export default function Pricing({ onSelectPlan, onOpenBilling }) {
  const { user, isAuthenticated, refreshProfile } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [sandboxOrder, setSandboxOrder] = useState(null);

  const plans = [
    {
      id: 'free',
      code: 'free',
      name: 'Free Starter',
      badge: 'Test & Build',
      popular: false,
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Ideal for trying out BotFlow AI on personal projects and small sites.',
      features: [
        '1 Custom AI Chatbot',
        '100 messages included / month',
        '3 Knowledge documents or URLs',
        'Standard RAG semantic search',
        'Basic BotFlow branding',
        'Community forum support'
      ],
      cta: 'Get Started Free',
      ctaStyle: 'bg-slate-100 hover:bg-slate-200 text-slate-800'
    },
    {
      id: 'pro',
      code: 'pro',
      name: 'Professional',
      badge: 'Most Popular',
      popular: true,
      monthlyPrice: 999,   // ₹999/mo
      annualPrice: 832,    // ₹9,990/yr (~₹832/mo)
      totalAnnual: 9990,
      description: 'Ideal for growing businesses, clinics, and startups requiring custom branding.',
      features: [
        '5 Custom AI Chatbots',
        '5,000 messages included / month',
        '25 Knowledge documents or URLs',
        'Remove BotFlow branding (White-label)',
        'Advanced visitor analytics & FAQs',
        'Custom color & avatar styling',
        'Email support (24h response)'
      ],
      cta: 'Upgrade to Pro',
      ctaStyle: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/40'
    },
    {
      id: 'business',
      code: 'business',
      name: 'Business',
      badge: 'Full Power',
      popular: false,
      monthlyPrice: 2499,  // ₹2,499/mo
      annualPrice: 2082,   // ₹24,990/yr (~₹2,082/mo)
      totalAnnual: 24990,
      description: 'For high-traffic platforms, hospitals, and universities with heavy volume.',
      features: [
        '20 Custom AI Chatbots',
        '25,000 messages included / month',
        '100 Knowledge documents or URLs',
        'Custom branding & full white-label',
        'Full conversation exports & transcripts',
        'Strict domain whitelisting & RLS',
        'Dedicated priority SLA support'
      ],
      cta: 'Upgrade to Business',
      ctaStyle: 'bg-slate-900 hover:bg-slate-800 text-white'
    }
  ];

  const currentPlanTier = (user?.plan_tier || 'free').toLowerCase();

  /**
   * Triggers checkout or authentication modal
   */
  async function handlePlanAction(plan) {
    setErrorMsg(null);
    setSuccessMsg(null);

    // If user is not signed in, open AuthModal
    if (!isAuthenticated) {
      if (onSelectPlan) onSelectPlan(plan.id);
      return;
    }

    // If plan is already user's active tier, open billing dashboard
    if (currentPlanTier === plan.code) {
      if (onOpenBilling) onOpenBilling();
      return;
    }

    // If user clicked free tier but is currently on paid tier
    if (plan.code === 'free') {
      if (onOpenBilling) onOpenBilling();
      return;
    }

    try {
      setLoadingPlan(plan.code);

      // 1. Create order on backend
      const order = await createBillingOrder({
        planCode: plan.code,
        billingCycle
      });

      // 2. Try loading live Razorpay SDK
      const hasRazorpayScript = await loadRazorpayCheckoutScript();

      if (hasRazorpayScript && window.Razorpay && !order.isSandbox && order.keyId.startsWith('rzp_live')) {
        // Open official Razorpay modal
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'BotFlow AI',
          description: `${order.planName} (${billingCycle})`,
          order_id: order.orderId,
          prefill: {
            name: user?.full_name || '',
            email: user?.email || ''
          },
          theme: {
            color: '#7c3aed'
          },
          handler: async (response) => {
            try {
              await verifyBillingPayment({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              });
              await refreshProfile();
              setSuccessMsg(`🎉 Successfully upgraded to ${plan.name}! Your new features and limits are now active.`);
            } catch (verErr) {
              setErrorMsg(verErr.message || 'Payment signature verification failed.');
            }
          }
        });

        rzp.open();
      } else {
        // Sandbox test simulation modal
        setSandboxOrder(order);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMsg(err.message || 'Failed to initiate checkout.');
    } finally {
      setLoadingPlan(null);
    }
  }

  /**
   * Simulates payment confirmation in sandbox development mode
   */
  async function handleSimulateSandboxPayment(success = true) {
    if (!sandboxOrder) return;
    try {
      setLoadingPlan(sandboxOrder.planCode);
      if (success) {
        // Submit simulated signature for backend verification
        await verifyBillingPayment({
          orderId: sandboxOrder.orderId,
          paymentId: `pay_mock_${Date.now()}`,
          signature: 'sig_test_mock_sandbox_signature'
        });
        await refreshProfile();
        setSuccessMsg(`🎉 Successfully upgraded to ${sandboxOrder.planName}! Your new limits and custom branding are active.`);
      } else {
        setErrorMsg('Simulated payment was cancelled or declined by issuing bank.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment verification failed.');
    } finally {
      setLoadingPlan(null);
      setSandboxOrder(null);
    }
  }

  return (
    <section id="pricing" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100/70 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Simple & Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Flexible Plans in Indian Rupees for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
              Every Stage of Growth
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Start completely free, then upgrade seamlessly with secure Razorpay checkout.
          </p>

          {/* Messages */}
          {errorMsg && (
            <div className="mt-4 inline-flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 inline-flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-bounce">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Billing Cycle Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-semibold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-14 h-8 bg-purple-600 rounded-full p-1 transition-colors duration-200 focus:outline-none"
              aria-label="Toggle billing cycle"
            >
              <div
                className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-semibold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-slate-900' : 'text-slate-500'}`}>
              Annual
              <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const isCurrent = isAuthenticated && currentPlanTier === plan.code;
            const isLoadingThis = loadingPlan === plan.code;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  isCurrent
                    ? 'bg-gradient-to-b from-purple-50/80 via-white to-purple-50/30 border-2 border-emerald-500 shadow-xl'
                    : plan.popular
                    ? 'bg-gradient-to-b from-purple-50/80 via-white to-purple-50/30 border-2 border-purple-500 shadow-2xl shadow-purple-600/15 -translate-y-2'
                    : 'bg-white border border-slate-200 hover:border-purple-200 hover:shadow-lg'
                }`}
              >
                {/* Popular or Current Badge */}
                {isCurrent ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Your Current Plan</span>
                  </div>
                ) : plan.popular ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                    <span>{plan.badge}</span>
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    {!plan.popular && !isCurrent && (
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs sm:text-sm text-slate-500">{plan.description}</p>

                  {/* Price */}
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-500 text-sm font-semibold">
                      / month
                    </span>
                  </div>
                  {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                    <p className="text-[11px] text-purple-600 font-semibold mt-1">
                      Billed annually (₹{plan.totalAnnual.toLocaleString('en-IN')}/year)
                    </p>
                  )}

                  {/* Feature Checklist */}
                  <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      What's Included:
                    </p>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA */}
                <div className="mt-8 pt-4">
                  <button
                    onClick={() => handlePlanAction(plan)}
                    disabled={isLoadingThis}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                        : plan.ctaStyle
                    } disabled:opacity-60`}
                  >
                    {isLoadingThis ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Current Active Plan</span>
                      </>
                    ) : (
                      <>
                        <span>{isAuthenticated ? (plan.code === 'free' ? 'Included' : `Upgrade to ${plan.name}`) : plan.cta}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-2">
                    {plan.monthlyPrice === 0 ? 'No credit card required' : 'Instant activation • Cancel anytime'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Callout Banner */}
        <div className="mt-16 bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Need Dedicated On-Premise or HIPAA/FERPA Cloud?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                We partner with hospital networks, state universities, and enterprises requiring custom SLAs, VPC peering, and custom integrations.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectPlan && onSelectPlan('enterprise')}
            className="whitespace-nowrap px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md"
          >
            Contact Enterprise Sales
          </button>
        </div>
      </div>

      {/* Sandbox Test Checkout Simulation Modal */}
      {sandboxOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">Razorpay Checkout (Test Sandbox)</h3>
              </div>
              <button
                onClick={() => setSandboxOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Plan:</span>
                <span className="font-bold text-purple-900">{sandboxOrder.planName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Billing Cycle:</span>
                <span className="font-semibold capitalize text-slate-800">{sandboxOrder.billingCycle}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Order ID:</span>
                <span className="font-mono text-[11px] text-slate-800">{sandboxOrder.orderId}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-purple-200/60 text-sm font-bold text-purple-950">
                <span>Total Amount:</span>
                <span>₹{sandboxOrder.amountInRupees?.toLocaleString('en-IN')} INR</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              ℹ️ Sandbox test environment active: No real bank or credit card will be charged. Click below to verify end-to-end payment activation.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleSimulateSandboxPayment(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Simulate Failure
              </button>
              <button
                onClick={() => handleSimulateSandboxPayment(true)}
                className="py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition"
              >
                Simulate Payment Success
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
