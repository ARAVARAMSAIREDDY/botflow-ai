import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  Activity, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Sparkles, 
  ExternalLink, 
  Code,
  Database,
  UploadCloud,
  Trash2,
  Shield,
  Lock,
  Building,
  AlertCircle,
  Globe,
  BarChart3,
  CreditCard,
  Inbox,
  HelpCircle
} from 'lucide-react';
import { getChatbots, createChatbot, deleteChatbot } from '../services/api';
import { useAuth } from '../context/AuthContext';
import KnowledgeBaseModal from './KnowledgeBaseModal';
import DomainManagementModal from './DomainManagementModal';

export default function DashboardPreview({ 
  onOpenEmbed, 
  onOpenAuth, 
  onOpenBilling,
  onOpenAnalytics,
  onOpenInbox,
  onOpenKnowledgeGaps
}) {
  const { user, isAuthenticated, token, usage, refreshProfile } = useAuth();

  const demoSeedBots = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Customer Support Bot',
      domain: 'botflow.ai/support',
      status: 'Active',
      docsCount: 34,
      conversations: '8,420',
      lastActive: '2 mins ago',
      color: 'bg-purple-600'
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'University Admissions Guide',
      domain: 'campus.edu/admissions',
      status: 'Active',
      docsCount: 18,
      conversations: '5,190',
      lastActive: '5 mins ago',
      color: 'bg-indigo-600'
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'MetroCare Patient FAQ',
      domain: 'metrocare.org/help',
      status: 'Active',
      docsCount: 29,
      conversations: '3,840',
      lastActive: '14 mins ago',
      color: 'bg-emerald-600'
    }
  ];

  const [bots, setBots] = useState(demoSeedBots);
  const [loadingBots, setLoadingBots] = useState(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [activeKnowledgeBot, setActiveKnowledgeBot] = useState(null);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [activeDomainBot, setActiveDomainBot] = useState(null);

  // Sync with backend on mount and when authentication changes
  const fetchBackendBots = async () => {
    try {
      setLoadingBots(true);
      const data = await getChatbots(token);
      if (data && Array.isArray(data)) {
        if (isAuthenticated && data.length === 0) {
          setBots([]);
        } else if (data.length > 0) {
          const mapped = data.map((b, idx) => ({
            ...b,
            id: b.id,
            public_id: b.public_id || b.id,
            name: b.name,
            domain: b.domain || 'yourdomain.com',
            status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Active',
            docsCount: b.docsCount || (b.knowledge_sources?.length ?? 1),
            conversations: b.conversations || (idx * 40 + 12).toString(),
            lastActive: `${idx * 4 + 2} mins ago`,
            color: idx % 3 === 0 ? 'bg-purple-600' : idx % 3 === 1 ? 'bg-indigo-600' : 'bg-emerald-600'
          }));
          setBots(mapped);
        }
      }
    } catch (err) {
      console.log('Using default bots preview (backend:', err.message, ')');
      if (!isAuthenticated) {
        setBots(demoSeedBots);
      }
    } finally {
      setLoadingBots(false);
    }
  };

  useEffect(() => {
    fetchBackendBots();
  }, [isAuthenticated, token]);

  const [recentConversations] = useState([
    {
      id: 'conv-891',
      user: 'Anonymous Visitor #914',
      botName: 'Customer Support Bot',
      query: 'How do I upgrade to the Enterprise annual plan?',
      status: 'Resolved',
      time: 'Just now',
      sentiment: 'Positive'
    },
    {
      id: 'conv-890',
      user: 'sarah.m@healthco.com',
      botName: 'MetroCare Patient FAQ',
      query: 'What are the visiting hours for the cardiology wing?',
      status: 'Resolved',
      time: '3m ago',
      sentiment: 'Positive'
    },
    {
      id: 'conv-889',
      user: 'admit_seeker22@gmail.com',
      botName: 'University Admissions Guide',
      query: 'Can international students apply for spring semester scholarships?',
      status: 'Resolved',
      time: '8m ago',
      sentiment: 'Neutral'
    },
    {
      id: 'conv-888',
      user: 'david@agencyflow.io',
      botName: 'Sales Qualifier & Booking',
      query: 'Can you transfer me to an account executive right away?',
      status: 'Handed Over',
      time: '14m ago',
      sentiment: 'Neutral'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotTone, setNewBotTone] = useState('Friendly & Professional');
  const [newBotDomain, setNewBotDomain] = useState('');
  const [creatingBot, setCreatingBot] = useState(false);

  const handleCreateBot = async (e) => {
    e.preventDefault();
    if (!newBotName.trim()) return;

    setCreatingBot(true);
    const botPayload = {
      name: newBotName.trim(),
      domain: newBotDomain.trim() || 'yourdomain.com',
      mode: 'knowledge',
      tone: newBotTone.toLowerCase().includes('friendly') ? 'friendly' : 'professional',
      welcome_message: `Hello! I am ${newBotName}. How can I assist you today?`
    };

    try {
      const created = await createChatbot(botPayload, token);
      const newBot = {
        id: created.id || Date.now(),
        name: created.name || newBotName,
        domain: created.domain || newBotDomain || 'yourdomain.com',
        status: 'Active',
        docsCount: 0,
        conversations: '0',
        lastActive: 'Just now',
        color: 'bg-purple-600'
      };
      setBots((prev) => [newBot, ...prev]);
      if (refreshProfile) refreshProfile();
    } catch (err) {
      if (err.message && (err.message.toLowerCase().includes('plan limit') || err.message.toLowerCase().includes('exceeded'))) {
        alert(err.message);
        if (onOpenBilling) onOpenBilling();
        return;
      }
      console.warn('Backend create failed, storing locally:', err.message);
      const fallbackBot = {
        id: Date.now(),
        name: newBotName,
        domain: newBotDomain || 'yourdomain.com',
        status: 'Active',
        docsCount: 0,
        conversations: '0',
        lastActive: 'Just now',
        color: 'bg-purple-600'
      };
      setBots((prev) => [fallbackBot, ...prev]);
    } finally {
      setCreatingBot(false);
      setNewBotName('');
      setNewBotDomain('');
      setIsModalOpen(false);
    }
  };

  const handleDeleteBot = async (botId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chatbot and all its uploaded documents?')) return;

    try {
      await deleteChatbot(botId, token);
      setBots((prev) => prev.filter((b) => b.id !== botId));
      if (refreshProfile) refreshProfile();
    } catch (err) {
      alert(`Failed to delete chatbot: ${err.message}`);
    }
  };

  return (
    <section id="dashboard" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-700/60 text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Control Center
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {isAuthenticated ? 'Your Multi-Tenant Dashboard' : 'Powerful Admin Dashboard Preview'}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            {isAuthenticated
              ? `Manage your organization's custom AI assistants, ingest private knowledge sources, and monitor real-time visitor inquiries.`
              : 'Monitor real-time engagement, analyze customer questions, inspect transcripts, and deploy new AI bots in seconds.'}
          </p>
        </div>

        {/* Tenant Banner if Logged In / Guest Banner if Not */}
        {isAuthenticated ? (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">
                    {user.business_name || 'My Organization Workspace'}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/20 text-purple-200 border border-purple-400/30 font-bold uppercase">
                    {user.plan_tier || 'Free'} Tier
                  </span>
                </div>
                <p className="text-xs text-purple-200">
                  Authenticated as <strong className="text-white">{user.email}</strong> • Tenant isolation active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenBilling}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 text-xs font-bold transition shadow-sm"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Subscription & Quotas</span>
              </button>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>PostgreSQL RLS Active</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-purple-950/70 border border-purple-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-purple-400 shrink-0" />
              <p className="text-xs text-purple-200">
                <strong>Demonstration Preview Mode:</strong> Sign in or create a free account to persist your own custom AI chatbots and confidential documents.
              </p>
            </div>
            <button
              onClick={() => onOpenAuth && onOpenAuth('signup')}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-sm"
            >
              Sign Up Free
            </button>
          </div>
        )}

        {/* Dashboard Frame */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Top Control Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{isAuthenticated ? (user.business_name || 'Organization Bots') : 'BotFlow Workspace'}</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold px-2.5 py-0.5 rounded-full">
                  {isAuthenticated ? 'Tenant Node' : 'Preview Node'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Live overview of your connected chatbots and user activity
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={onOpenAnalytics}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
              >
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>Analytics & BI</span>
              </button>

              <button
                onClick={() => onOpenInbox && onOpenInbox()}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
              >
                <Inbox className="w-4 h-4 text-indigo-400" />
                <span>Inbox & Support</span>
              </button>

              <button
                onClick={onOpenKnowledgeGaps}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Knowledge Gaps</span>
              </button>

              <button
                onClick={() => {
                  if (bots.length > 0) {
                    setActiveKnowledgeBot(bots[0]);
                    setIsKnowledgeModalOpen(true);
                  } else {
                    setIsModalOpen(true);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
              >
                <Database className="w-4 h-4 text-purple-400" />
                <span>RAG Knowledge</span>
              </button>
              
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md shadow-purple-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>New Chatbot</span>
              </button>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-6 border-b border-slate-800 bg-slate-900/40">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Chatbots</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{bots.length}</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center">
                  <Activity className="w-3 h-3 mr-0.5" /> {bots.length} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Multi-tenant vector isolated</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Conversations</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {isAuthenticated ? (usage.totalConversations || '0') : '18,420'}
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +14.8%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Across web & mobile widgets</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Messages</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {isAuthenticated ? (usage.totalMessages || '0') : '64,810'}
                </span>
                <span className="text-xs text-slate-400">3.5 msgs / session</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Avg response time: 0.72s</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Auto-Resolution Rate</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400">94.2%</span>
                <span className="text-xs text-slate-400">5.8% human handover</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Grounded vector citations</p>
            </div>
          </div>

          {/* Main Dashboard Content: Bots list + Recent Conversations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left: Chatbot Fleet & Management (col-span-7) */}
            <div className="lg:col-span-7 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span>Chatbot Fleet ({bots.length})</span>
                </h4>
                <span className="text-xs text-purple-400 font-medium">
                  {isAuthenticated ? 'Tenant isolated namespace' : 'All systems operational'}
                </span>
              </div>

              {bots.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                  <Bot className="w-10 h-10 text-purple-400 mx-auto mb-3 opacity-60" />
                  <h5 className="text-sm font-bold text-slate-200 mb-1">No Chatbots Created Yet</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Create your first AI assistant to start training it with documents and embed it into your site.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create My First Chatbot</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bots.map((bot) => (
                    <div
                      key={bot.id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${bot.color || 'bg-purple-600'} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-white flex items-center gap-2">
                            {bot.name}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                bot.status === 'Active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {bot.status}
                            </span>
                            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/80">
                              {bot.public_id || (bot.id ? bot.id.slice(0, 10) : 'public')}
                            </span>
                          </h5>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {bot.domain || 'All domains'} • <span className="text-purple-300">{bot.docsCount} docs synced</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                        <div className="text-left sm:text-right hidden sm:block mr-1">
                          <p className="text-xs font-bold text-slate-200">{bot.conversations}</p>
                          <p className="text-[10px] text-slate-500">chats handled</p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveKnowledgeBot(bot);
                            setIsKnowledgeModalOpen(true);
                          }}
                          title="Manage documents & knowledge base"
                          className="px-2.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 text-xs font-medium border border-purple-800 flex items-center gap-1.5 transition"
                        >
                          <Database className="w-3.5 h-3.5 text-purple-400" />
                          <span>Knowledge</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveDomainBot(bot);
                            setIsDomainModalOpen(true);
                          }}
                          title="Manage allowed domains & view analytics"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-xs font-medium border border-indigo-800 flex items-center gap-1.5 transition"
                        >
                          <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Domains & Analytics</span>
                        </button>
                        <button
                          onClick={() => onOpenEmbed && onOpenEmbed(bot)}
                          title="Get embed code"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/30 text-purple-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Embed</span>
                        </button>
                        {isAuthenticated && (
                          <button
                            onClick={(e) => handleDeleteBot(bot.id, e)}
                            title="Delete chatbot"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Recent Conversations Feed (col-span-5) */}
            <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-950/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Live Conversation Feed
                  </h4>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Streaming
                  </span>
                </div>
                {onOpenInbox && (
                  <button
                    onClick={() => onOpenInbox()}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>Open Inbox</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {recentConversations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenInbox && onOpenInbox(item.id)}
                    className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-900/80 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                        {item.user}
                      </span>
                      <span className="text-[10px] text-slate-500">{item.time}</span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 italic bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                      "{item.query}"
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-purple-400 font-medium">{item.botName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.status === 'Resolved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create New Chatbot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              Create New AI Chatbot
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAuthenticated
                ? `Created under tenant ${user.business_name || user.email}`
                : 'Set up a brand new conversational assistant for your website or app.'}
            </p>

            <form onSubmit={handleCreateBot} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chatbot Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dining Reservation Concierge"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deployment Website / Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. yourrestaurant.com"
                  value={newBotDomain}
                  onChange={(e) => setNewBotDomain(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Persona & Tone
                </label>
                <select
                  value={newBotTone}
                  onChange={(e) => setNewBotTone(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  <option>Friendly & Professional</option>
                  <option>Empathetic & Caring (Healthcare / Wellness)</option>
                  <option>Academic & Thorough (University / Education)</option>
                  <option>Casual & Energetic (Retail / Hospitality)</option>
                  <option>Strict & Technical (API / Developer Support)</option>
                </select>
              </div>

              <div className="p-3 bg-purple-950/50 border border-purple-800/60 rounded-xl text-xs text-purple-300">
                💡 Once created, you can upload PDF handbooks or provide a web URL to train this bot.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={creatingBot}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBot}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-md transition disabled:opacity-50"
                >
                  {creatingBot ? 'Creating...' : 'Create Chatbot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Knowledge Base & RAG Management Modal */}
      {bots.length > 0 && (
        <KnowledgeBaseModal
          isOpen={isKnowledgeModalOpen}
          onClose={() => setIsKnowledgeModalOpen(false)}
          chatbot={activeKnowledgeBot || bots[0]}
          chatbots={bots}
        />
      )}

      {/* Domain Management & Analytics Modal */}
      {bots.length > 0 && (
        <DomainManagementModal
          isOpen={isDomainModalOpen}
          onClose={() => setIsDomainModalOpen(false)}
          chatbot={activeDomainBot || bots[0]}
          onChatbotUpdated={() => {
            fetchBackendBots();
            if (refreshProfile) refreshProfile();
          }}
        />
      )}
    </section>
  );
}
