import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import UseCases from './components/UseCases';
import DashboardPreview from './components/DashboardPreview';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import LiveChatWidget from './components/LiveChatWidget';
import IntegrationCodeModal from './components/IntegrationCodeModal';
import DemoVideoModal from './components/DemoVideoModal';
import AuthModal from './components/AuthModal';
import AccountSettingsModal from './components/AccountSettingsModal';
import BillingDashboardModal from './components/BillingDashboardModal';
import AnalyticsDashboardModal from './components/AnalyticsDashboardModal';
import ConversationInboxModal from './components/ConversationInboxModal';
import KnowledgeGapsModal from './components/KnowledgeGapsModal';
import NotificationCenterModal from './components/NotificationCenterModal';
import LegalModal from './components/LegalModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { fetchNotifications } from './services/api';
import { ChevronDown, HelpCircle, Sparkles, MessageCircle } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, token } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [activeEmbedBot, setActiveEmbedBot] = useState(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  // Phase 7 Analytics, Inbox, Knowledge Gaps, Notifications state
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [inboxModalOpen, setInboxModalOpen] = useState(false);
  const [knowledgeGapsModalOpen, setKnowledgeGapsModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [selectedInboxConvId, setSelectedInboxConvId] = useState(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Legal Modal State
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('privacy');

  // Poll for unread notifications count when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotificationsCount(0);
      return;
    }

    const checkNotifications = async () => {
      try {
        const res = await fetchNotifications({ unreadOnly: true, limit: 10 }, token);
        if (res && typeof res.unreadCount === 'number') {
          setUnreadNotificationsCount(res.unreadCount);
        }
      } catch (err) {
        // silent catch
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const handleOpenInbox = (convId = null) => {
    setSelectedInboxConvId(convId);
    setInboxModalOpen(true);
  };

  const handleOpenAuth = (mode = 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenEmbed = (bot = null) => {
    setActiveEmbedBot(bot);
    setEmbedModalOpen(true);
  };

  const handleOpenLegal = (tab = 'privacy') => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  const faqs = [
    {
      q: 'Do I need programming skills to build or embed a chatbot?',
      a: 'Not at all! BotFlow AI was specifically designed for marketing teams, clinic staff, admissions offices, and small business owners. All you have to do is upload your documents or type your website URL, then copy a single line of script to your site.'
    },
    {
      q: 'How does BotFlow AI prevent made-up answers or hallucinations?',
      a: 'We use strict Retrieval-Augmented Generation (RAG). Before answering any query, the engine semantically searches only through your verified documents and web pages. If information is missing from your knowledge base, the bot politely states it doesn’t know or offers to transfer the user to your support email.'
    },
    {
      q: 'Can I upload confidential documents (like hospital protocols or fee policies)?',
      a: 'Yes. Each organization receives an isolated, encrypted vector namespace with PostgreSQL Row Level Security. Your uploaded documents are never used to train public foundation models and remain strictly private to your tenant.'
    },
    {
      q: 'What platforms can I install the BotFlow widget on?',
      a: 'Any website platform! Our asynchronous script works seamlessly on WordPress, Shopify, Webflow, Squarespace, Wix, Next.js, React, Angular, Vue, and traditional static HTML websites.'
    },
    {
      q: 'Can human staff take over live conversations?',
      a: 'Yes! On Pro and Business tiers, you can configure human handover triggers (for example, if a user types "talk to human" or sentiment turns frustrated). Transcripts can be immediately dispatched to your Slack or Zendesk inbox.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9ff] text-slate-800 selection:bg-purple-600 selection:text-white">
      {/* Navigation */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenEmbed={handleOpenEmbed}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenBilling={() => setBillingModalOpen(true)}
        onOpenAnalytics={() => setAnalyticsModalOpen(true)}
        onOpenInbox={(convId) => handleOpenInbox(convId)}
        onOpenKnowledgeGaps={() => setKnowledgeGapsModalOpen(true)}
        onOpenNotifications={() => setNotificationsModalOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Page Sections */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero
          onOpenAuth={handleOpenAuth}
          onOpenDemo={() => setDemoModalOpen(true)}
          onOpenChat={() => setLiveChatOpen(true)}
        />

        {/* Features Section */}
        <Features
          onOpenEmbed={handleOpenEmbed}
          onOpenChat={() => setLiveChatOpen(true)}
        />

        {/* How It Works Section */}
        <HowItWorks
          onOpenAuth={handleOpenAuth}
          onOpenEmbed={handleOpenEmbed}
        />

        {/* Industry Use Cases Section */}
        <UseCases
          onOpenChat={() => setLiveChatOpen(true)}
          onOpenAuth={handleOpenAuth}
        />

        {/* Dashboard Preview Section (Connected to Multi-Tenant Auth) */}
        <DashboardPreview
          onOpenEmbed={handleOpenEmbed}
          onOpenAuth={handleOpenAuth}
          onOpenBilling={() => setBillingModalOpen(true)}
          onOpenAnalytics={() => setAnalyticsModalOpen(true)}
          onOpenInbox={(convId) => handleOpenInbox(convId)}
          onOpenKnowledgeGaps={() => setKnowledgeGapsModalOpen(true)}
        />

        {/* Pricing Section */}
        <Pricing
          onSelectPlan={(planId) => handleOpenAuth('signup')}
          onOpenBilling={() => setBillingModalOpen(true)}
        />

        {/* FAQ Section */}
        <section className="py-20 bg-slate-50 border-t border-purple-100/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
                <HelpCircle className="w-3.5 h-3.5" />
                Frequently Asked Questions
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Everything You Need to Know
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Have questions about deployment, data security, or document chunking? We have answers.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="border border-purple-100 rounded-2xl bg-white overflow-hidden shadow-sm transition"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-slate-800 text-sm sm:text-base hover:text-purple-700 transition"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-purple-500 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-purple-50/80 animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pre-Footer Call to Action Banner */}
        <section className="py-16 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-4">
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>Ready in less than 5 minutes</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Transform Customer Support With Your Custom AI Agent
            </h3>
            <p className="mt-4 text-purple-100 text-sm sm:text-base max-w-2xl mx-auto">
              Join thousands of businesses, clinics, universities, and hospitality brands deploying intelligent RAG chatbots today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => handleOpenAuth('signup')}
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-purple-900 rounded-xl font-bold text-sm shadow-xl hover:bg-purple-50 hover:-translate-y-0.5 transition"
              >
                Create Your Chatbot Free
              </button>
              <button
                onClick={() => setLiveChatOpen(true)}
                className="w-full sm:w-auto px-7 py-3.5 bg-purple-900/60 hover:bg-purple-900/90 border border-purple-400/40 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Test Live Chat Widget</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        onOpenAuth={handleOpenAuth}
        onOpenEmbed={handleOpenEmbed}
        onOpenLegal={handleOpenLegal}
      />

      {/* Interactive Floating Chatbot */}
      <LiveChatWidget
        isOpen={liveChatOpen}
        setIsOpen={setLiveChatOpen}
      />

      {/* Modals */}
      <IntegrationCodeModal
        isOpen={embedModalOpen}
        onClose={() => setEmbedModalOpen(false)}
        chatbot={activeEmbedBot}
      />

      <DemoVideoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onOpenChat={() => setLiveChatOpen(true)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <AccountSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onOpenBilling={() => setBillingModalOpen(true)}
      />

      <BillingDashboardModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        onOpenPricing={() => {
          setBillingModalOpen(false);
          const pricingEl = document.getElementById('pricing');
          if (pricingEl) pricingEl.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Phase 7 Modals */}
      <AnalyticsDashboardModal
        isOpen={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        onOpenKnowledgeGaps={() => {
          setAnalyticsModalOpen(false);
          setKnowledgeGapsModalOpen(true);
        }}
        onOpenInbox={(convId) => {
          setAnalyticsModalOpen(false);
          handleOpenInbox(convId);
        }}
      />

      <ConversationInboxModal
        isOpen={inboxModalOpen}
        onClose={() => setInboxModalOpen(false)}
        initialConversationId={selectedInboxConvId}
      />

      <KnowledgeGapsModal
        isOpen={knowledgeGapsModalOpen}
        onClose={() => setKnowledgeGapsModalOpen(false)}
        onOpenUpload={() => {
          setKnowledgeGapsModalOpen(false);
          const dash = document.getElementById('dashboard');
          if (dash) dash.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <NotificationCenterModal
        isOpen={notificationsModalOpen}
        onClose={() => {
          setNotificationsModalOpen(false);
          if (isAuthenticated) {
            fetchNotifications({ unreadOnly: true, limit: 10 }, token)
              .then(res => setUnreadNotificationsCount(res.unreadCount || 0))
              .catch(() => {});
          }
        }}
        onOpenInbox={(convId) => {
          setNotificationsModalOpen(false);
          handleOpenInbox(convId);
        }}
      />

      {/* Legal & Compliance Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
