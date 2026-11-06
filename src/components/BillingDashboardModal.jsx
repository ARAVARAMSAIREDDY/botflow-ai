import React, { useState, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  Clock, 
  Zap, 
  Layers, 
  MessageSquare, 
  FileCode,
  AlertTriangle,
  RotateCw
} from 'lucide-react';
import { fetchBillingDetails, cancelSubscription } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BillingDashboardModal({ isOpen, onClose, onOpenPricing }) {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDetails();
      setShowCancelConfirm(false);
      setCancelSuccess(false);
    }
  }, [isOpen]);

  async function loadDetails() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBillingDetails();
      setBillingData(data);
    } catch (err) {
      console.error('Error fetching billing details:', err);
      setError(err.message || 'Failed to load billing metrics.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    try {
      setCancelling(true);
      setError(null);
      await cancelSubscription();
      setCancelSuccess(true);
      setShowCancelConfirm(false);
      await loadDetails();
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  }

  if (!isOpen) return null;

  const planTier = (billingData?.planTier || user?.plan_tier || 'free').toLowerCase();
  const isFree = planTier === 'free';
  const isCancelled = billingData?.subscription?.cancelAtPeriodEnd;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Subscription & Billing</h2>
              <p className="text-xs text-slate-500">Manage your BotFlow AI plan, resource quotas, and invoices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {cancelSuccess && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Your subscription has been scheduled for cancellation. You will retain all {planTier.toUpperCase()} features until the end of your billing cycle ({formatDate(billingData?.subscription?.currentPeriodEnd)}).
              </span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading your subscription and usage details...</p>
            </div>
          ) : (
            <>
              {/* 1. Current Plan Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/40 text-[11px] font-extrabold uppercase tracking-wider text-purple-200">
                        {billingData?.badge || `${planTier} Plan`}
                      </span>
                      {isCancelled && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                          Cancels at Period End
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black mt-2 text-white">
                      {billingData?.planName || `${planTier.toUpperCase()} Starter`}
                    </h3>
                    <p className="text-xs text-purple-200/80 mt-1">
                      {isFree
                        ? 'You are on the free starter tier. Upgrade to unlock more bots and white-label branding.'
                        : `Billed ${billingData?.subscription?.billingCycle || 'monthly'} in Indian Rupees (INR).`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenPricing) onOpenPricing();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs shadow-md shadow-purple-900/50 flex items-center gap-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                      <span>{isFree ? 'Upgrade to Pro' : 'Change Plan'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subscription Details Footer */}
                {!isFree && (
                  <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-purple-200/80">
                    <div>
                      <span className="block text-[10px] uppercase text-purple-300/60 font-semibold">Status</span>
                      <span className="font-bold text-white capitalize">{billingData?.subscription?.status || 'Active'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-purple-300/60 font-semibold">
                        {isCancelled ? 'Access Until' : 'Renews On'}
                      </span>
                      <span className="font-bold text-white">
                        {formatDate(billingData?.subscription?.currentPeriodEnd)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-purple-300/60 font-semibold">Payment Method</span>
                      <span className="font-bold text-white">Razorpay Secure</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Usage & Quotas Progress Bars */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span>Monthly Quota & Usage</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Cycle resets monthly on 1st
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Chatbots Quota */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        Chatbots
                      </span>
                      <span className="font-bold text-slate-900">
                        {billingData?.usage?.chatbots?.used || 0} / {billingData?.usage?.chatbots?.limit || 1}
                      </span>
                    </div>
                    <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${billingData?.usage?.chatbots?.percentage || 0}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500 text-right">
                      {billingData?.usage?.chatbots?.percentage || 0}% of limit
                    </p>
                  </div>

                  {/* Documents & URLs Quota */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                        Knowledge Sources
                      </span>
                      <span className="font-bold text-slate-900">
                        {billingData?.usage?.documents?.used || 0} / {billingData?.usage?.documents?.limit || 3}
                      </span>
                    </div>
                    <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${billingData?.usage?.documents?.percentage || 0}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500 text-right">
                      {billingData?.usage?.documents?.percentage || 0}% of limit
                    </p>
                  </div>

                  {/* Monthly Messages Quota */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        Messages / Month
                      </span>
                      <span className="font-bold text-slate-900">
                        {billingData?.usage?.messages?.used || 0} / {billingData?.usage?.messages?.limit || 100}
                      </span>
                    </div>
                    <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${billingData?.usage?.messages?.percentage || 0}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500 text-right">
                      {billingData?.usage?.messages?.percentage || 0}% of limit
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Invoices & Billing History Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Invoices & Billing History</span>
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {billingData?.invoices && billingData.invoices.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Invoice Number</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Plan</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {billingData.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-purple-50/40 transition">
                            <td className="px-4 py-3 font-mono font-bold text-purple-700">
                              {inv.invoice_number}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatDate(inv.created_at)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800 uppercase">
                              {inv.plan_code}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              ₹{inv.amount_inr?.toLocaleString('en-IN') || 0}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                Paid
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <span>No paid invoices yet. Upgrade to Pro or Business to receive official GST invoices.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Subscription Management / Cancellation Options */}
              {!isFree && !isCancelled && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Need to pause or cancel?</h5>
                    <p className="text-[11px] text-slate-500">
                      You can cancel anytime. You will maintain access until the end of your prepaid period.
                    </p>
                  </div>

                  {!showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      Cancel Subscription
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition"
                      >
                        Nevermind
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {cancelling ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>Confirm Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
