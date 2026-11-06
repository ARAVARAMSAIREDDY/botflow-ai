import React, { useState } from 'react';
import { X, Shield, FileText, RefreshCw, Lock, CheckCircle2, ExternalLink } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, initialTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div 
        className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                BotFlow AI Legal & Trust Center
              </h2>
              <p className="text-xs text-slate-400">
                Compliance, data privacy, terms of service and security standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/90 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Privacy Policy
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Terms of Service
          </button>

          <button
            onClick={() => setActiveTab('refunds')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'refunds'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Cancellation & Refunds
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Security & HIPAA
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-300 text-xs sm:text-sm leading-relaxed space-y-6">
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 text-xs">
                <span className="font-bold">Zero AI Training Guarantee:</span> Your uploaded documents, scraped URLs, and customer chat histories are strictly isolated to your tenant. BotFlow AI never uses your proprietary enterprise data to train or fine-tune public foundation AI models.
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">1. Data We Collect & Process</h3>
                <p className="text-slate-400">
                  We collect account credentials (email and password hashes), uploaded business documents (PDF, DOCX, TXT, CSV), website URLs for RAG knowledge sync, visitor interaction logs, and Razorpay transaction metadata. No payment card details are stored on our servers.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">2. GDPR & CCPA Compliance</h3>
                <p className="text-slate-400">
                  BotFlow AI adheres to GDPR and CCPA privacy standards. Registered users may access, export, or permanently purge their chatbot data, embeddings, and conversation histories at any time through the dashboard or by contacting privacy@botflow.ai.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">3. Storage & Isolation</h3>
                <p className="text-slate-400">
                  Uploaded files are stored in private Supabase S3-compatible object storage with AES-256 encryption. Vector search embeddings are protected with PostgreSQL Row Level Security (RLS) enforcing strict tenant boundaries.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 text-xs">
                <span className="font-bold text-white">SaaS Agreement:</span> By accessing or integrating BotFlow AI, you agree to these Terms of Service. Stated plan quotas (messages, chatbots, documents) apply on a monthly calendar cycle.
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">1. Permitted Use & Restrictions</h3>
                <p className="text-slate-400">
                  You agree to use BotFlow AI in compliance with all applicable laws. You may not ingest unlawful or infringing copyright content, reverse-engineer the Embed Widget SDK, bypass origin domain restrictions, or execute prompt injection attacks.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">2. AI Hallucination & Accuracy Disclaimer</h3>
                <p className="text-slate-400">
                  BotFlow AI implements strict Retrieval-Augmented Generation (RAG) with source citations to minimize inaccuracies. However, generative AI models produce probabilistic responses. For critical healthcare, clinical, or financial contexts, human-in-the-loop oversight is advised.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">3. Intellectual Property</h3>
                <p className="text-slate-400">
                  You retain complete 100% intellectual property ownership over all documents, websites, logos, and conversation logs ingested into your chatbots.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'refunds' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-xs">
                <span className="font-bold">7-Day Money-Back Guarantee:</span> New subscribers can request a full 100% refund within 7 days of their initial upgrade to Pro or Business if not completely satisfied.
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">1. Subscription Cancellation</h3>
                <p className="text-slate-400">
                  You may cancel your monthly or annual subscription at any time with a single click from the Billing modal. Once cancelled, your recurring billing stops immediately, and you will retain access to paid features until the end of the current billing cycle.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">2. Graceful Downgrade</h3>
                <p className="text-slate-400">
                  At the end of your billing cycle, your account gracefully transitions to the Free Plan. Your existing chatbots and knowledge base files will be retained in read-only mode so you never lose your configurations.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">3. Refund Processing via Razorpay</h3>
                <p className="text-slate-400">
                  Refunds are credited directly back to your original payment method (Credit Card, Debit Card, UPI, or Net Banking) via Razorpay within 5 to 7 business days.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Row Level Security (RLS)
                  </div>
                  <p className="text-xs text-slate-400">
                    PostgreSQL database enforces cryptographic tenant user_id isolation on all tables.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    SSRF & Cloud Metadata Shield
                  </div>
                  <p className="text-xs text-slate-400">
                    Website sync verifies DNS resolution, blocking loopback and internal AWS/GCP metadata endpoints.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Constant-Time HMAC Signatures
                  </div>
                  <p className="text-xs text-slate-400">
                    Razorpay payments & webhooks verified using crypto.timingSafeEqual to prevent side-channel timing attacks.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Shadow DOM Widget Isolation
                  </div>
                  <p className="text-xs text-slate-400">
                    Embeddable chat widget runs inside an isolated Shadow Root, preventing host CSS contamination and script tampering.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">Healthcare & Clinic Data Safeguards</h3>
                <p className="text-slate-400">
                  For clinics, dental offices, and hospitals using BotFlow AI for appointment inquiries and department directions, patient PII is masked and not retained in public training corpora. All communications occur over encrypted TLS 1.3 channels.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            For legal inquiries, contact <a href="mailto:legal@botflow.ai" className="text-purple-400 hover:underline">legal@botflow.ai</a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
