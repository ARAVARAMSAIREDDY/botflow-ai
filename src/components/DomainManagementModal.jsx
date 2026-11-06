import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  ShieldCheck, 
  ShieldAlert, 
  BarChart3, 
  Palette, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  MessageSquare,
  HelpCircle,
  FileQuestion,
  Users,
  Lock,
  Sparkles,
  Bot
} from 'lucide-react';
import { 
  getChatbotAnalytics, 
  addChatbotDomain, 
  removeChatbotDomain, 
  toggleChatbotDomainRestriction,
  updateChatbotCustomization 
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DomainManagementModal({ isOpen, onClose, chatbot, onChatbotUpdated }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('domains'); // 'domains' | 'analytics' | 'customization'

  // Domain state
  const [domains, setDomains] = useState(chatbot?.allowed_domains || ['localhost', '127.0.0.1']);
  const [restrictDomains, setRestrictDomains] = useState(Boolean(chatbot?.restrict_domains));
  const [newDomain, setNewDomain] = useState('');
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainMessage, setDomainMessage] = useState({ text: '', type: '' });

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Customization state
  const [name, setName] = useState(chatbot?.name || '');
  const [primaryColor, setPrimaryColor] = useState(chatbot?.primary_color || '#7c3aed');
  const [position, setPosition] = useState(chatbot?.position || 'bottom-right');
  const [theme, setTheme] = useState(chatbot?.theme || 'light');
  const [windowSize, setWindowSize] = useState(chatbot?.window_size || 'standard');
  const [launcherIcon, setLauncherIcon] = useState(chatbot?.launcher_icon || 'message');
  const [welcomeMessage, setWelcomeMessage] = useState(chatbot?.welcome_message || '');
  const [customSaving, setCustomSaving] = useState(false);
  const [customMessage, setCustomMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (chatbot) {
      setDomains(chatbot.allowed_domains || ['localhost', '127.0.0.1']);
      setRestrictDomains(Boolean(chatbot.restrict_domains));
      setName(chatbot.name || '');
      setPrimaryColor(chatbot.primary_color || '#7c3aed');
      setPosition(chatbot.position || 'bottom-right');
      setTheme(chatbot.theme || 'light');
      setWindowSize(chatbot.window_size || 'standard');
      setLauncherIcon(chatbot.launcher_icon || 'message');
      setWelcomeMessage(chatbot.welcome_message || '');
    }
  }, [chatbot]);

  // Load analytics when opening tab
  useEffect(() => {
    if (isOpen && chatbot?.id && activeTab === 'analytics') {
      const fetchAnalytics = async () => {
        try {
          setAnalyticsLoading(true);
          const data = await getChatbotAnalytics(chatbot.id, token);
          setAnalytics(data);
        } catch (err) {
          console.warn('Failed to load analytics:', err.message);
        } finally {
          setAnalyticsLoading(false);
        }
      };
      fetchAnalytics();
    }
  }, [isOpen, chatbot?.id, activeTab, token]);

  if (!isOpen || !chatbot) return null;

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setDomainLoading(true);
    setDomainMessage({ text: '', type: '' });
    try {
      const res = await addChatbotDomain(chatbot.id, newDomain.trim(), token);
      setDomains(res.allowed_domains || [...domains, newDomain.trim()]);
      setNewDomain('');
      setDomainMessage({ text: `Domain "${newDomain.trim()}" added to allowed whitelist.`, type: 'success' });
      if (onChatbotUpdated) onChatbotUpdated(res);
      setTimeout(() => setDomainMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setDomainMessage({ text: err.message || 'Failed to add domain', type: 'error' });
    } finally {
      setDomainLoading(false);
    }
  };

  const handleRemoveDomain = async (domainToRemove) => {
    setDomainLoading(true);
    try {
      const res = await removeChatbotDomain(chatbot.id, domainToRemove, token);
      setDomains(res.allowed_domains || domains.filter(d => d !== domainToRemove));
      setDomainMessage({ text: `Removed "${domainToRemove}" from allowed domains.`, type: 'success' });
      if (onChatbotUpdated) onChatbotUpdated(res);
      setTimeout(() => setDomainMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setDomainMessage({ text: err.message || 'Failed to remove domain', type: 'error' });
    } finally {
      setDomainLoading(false);
    }
  };

  const handleToggleRestriction = async () => {
    const nextVal = !restrictDomains;
    setRestrictDomains(nextVal);
    try {
      const res = await toggleChatbotDomainRestriction(chatbot.id, nextVal, token);
      setDomainMessage({
        text: nextVal
          ? 'Domain restriction enabled. Unregistered website origins will be blocked.'
          : 'Domain restriction disabled. Widget can be embedded on any website.',
        type: 'success'
      });
      if (onChatbotUpdated) onChatbotUpdated(res);
      setTimeout(() => setDomainMessage({ text: '', type: '' }), 3500);
    } catch (err) {
      setRestrictDomains(!nextVal);
      setDomainMessage({ text: err.message || 'Failed to update domain restriction', type: 'error' });
    }
  };

  const handleSaveCustomization = async (e) => {
    e.preventDefault();
    setCustomSaving(true);
    setCustomMessage({ text: '', type: '' });

    try {
      const updated = await updateChatbotCustomization(chatbot.id, {
        name: name.trim(),
        primary_color: primaryColor,
        position,
        theme,
        window_size: windowSize,
        launcher_icon: launcherIcon,
        welcome_message: welcomeMessage.trim()
      }, token);

      setCustomMessage({ text: 'Widget customization saved successfully!', type: 'success' });
      if (onChatbotUpdated) onChatbotUpdated(updated);
      setTimeout(() => setCustomMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setCustomMessage({ text: err.message || 'Failed to save customization', type: 'error' });
    } finally {
      setCustomSaving(false);
    }
  };

  const publicId = chatbot.public_id || chatbot.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-purple-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-600/30 text-purple-300 flex items-center justify-center border border-purple-500/30 font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{chatbot.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Public ID: {publicId}
                </span>
              </div>
              <p className="text-xs text-purple-200">
                Manage website origin whitelisting, review visitor analytics, and configure widget styling.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 overflow-x-auto">
          {[
            { id: 'domains', label: 'Domain Whitelist & Security', icon: Globe },
            { id: 'analytics', label: 'Widget Analytics & Questions', icon: BarChart3 },
            { id: 'customization', label: 'Appearance & Customization', icon: Palette }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-purple-600 text-purple-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* TAB 1: Domain Whitelist & Security */}
          {activeTab === 'domains' && (
            <div className="space-y-6">
              {domainMessage.text && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                    domainMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {domainMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{domainMessage.text}</span>
                </div>
              )}

              {/* Restriction Toggle Banner */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    {restrictDomains ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Restrict Chatbot Usage to Allowed Domains
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {restrictDomains
                        ? 'Active: Any website NOT in your allowed domains list will be rejected with 403 Forbidden.'
                        : 'Inactive: The chatbot can be embedded on any website (open CORS mode).'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleRestriction}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-sm ${
                    restrictDomains
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {restrictDomains ? '✓ Whitelist Enforced' : 'Enforce Whitelist'}
                </button>
              </div>

              {/* Add Domain Form */}
              <form onSubmit={handleAddDomain} className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourcompany.com or shop.brand.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={domainLoading || !newDomain.trim()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {domainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add Domain</span>
                </button>
              </form>

              {/* Domains Table / List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Authorized Websites & Hostnames ({domains.length})</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {domains.map((domain) => (
                    <div key={domain} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition text-xs">
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-purple-600" />
                        <span className="font-mono font-semibold text-slate-800">{domain}</span>
                        {domain.includes('localhost') && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Localhost Dev</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                        {domain !== 'localhost' && domain !== '127.0.0.1' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(domain)}
                            title="Remove domain"
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Widget Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                  <span>Loading live chatbot analytics...</span>
                </div>
              ) : (
                <>
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-center">
                      <span className="text-[11px] font-semibold text-purple-600 block mb-0.5">Total Sessions</span>
                      <span className="text-2xl font-extrabold text-slate-800">{analytics?.totalSessions || 0}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center">
                      <span className="text-[11px] font-semibold text-indigo-600 block mb-0.5">Total Messages</span>
                      <span className="text-2xl font-extrabold text-slate-800">{analytics?.totalMessages || 0}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
                      <span className="text-[11px] font-semibold text-emerald-600 block mb-0.5">Active (30m)</span>
                      <span className="text-2xl font-extrabold text-slate-800">{analytics?.activeConversations || 0}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-center">
                      <span className="text-[11px] font-semibold text-blue-600 block mb-0.5">Top Domain</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-1">
                        {analytics?.domainsBreakdown?.[0]?.domain || 'Direct Web'}
                      </span>
                    </div>
                  </div>

                  {/* Top Frequently Asked Questions */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-purple-600" />
                      <span>Most Frequently Asked Questions</span>
                    </h4>
                    {analytics?.topQuestions && analytics.topQuestions.length > 0 ? (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                        {analytics.topQuestions.map((q, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                            <span className="text-slate-800 font-medium truncate pr-4">"{q.query}"</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[11px] shrink-0">
                              {q.count} {q.count === 1 ? 'inquiry' : 'inquiries'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-4 border border-dashed rounded-xl text-center">
                        No visitor questions recorded yet. Inquiries sent via the embed widget will appear here.
                      </p>
                    )}
                  </div>

                  {/* Unresolved Questions */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileQuestion className="w-4 h-4 text-amber-600" />
                      <span>Unresolved Questions (Knowledge Gaps)</span>
                    </h4>
                    {analytics?.unresolvedQuestions && analytics.unresolvedQuestions.length > 0 ? (
                      <div className="border border-amber-200 bg-amber-50/30 rounded-2xl overflow-hidden divide-y divide-amber-100 text-xs">
                        {analytics.unresolvedQuestions.map((uq, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between">
                            <span className="text-slate-800 italic truncate pr-4">"{uq.query}"</span>
                            <span className="text-[10px] text-amber-700 font-semibold shrink-0">
                              Triggered Fallback
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-4 border border-dashed rounded-xl text-center">
                        Zero unresolved questions! Your knowledge base successfully grounds all visitor queries.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: Widget Customization */}
          {activeTab === 'customization' && (
            <form onSubmit={handleSaveCustomization} className="space-y-4">
              {customMessage.text && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                    customMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{customMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chatbot Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Screen Position
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
                  >
                    <option value="bottom-right">Bottom-Right (Standard)</option>
                    <option value="bottom-left">Bottom-Left</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Widget Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
                  >
                    <option value="light">Light Theme (Clean White)</option>
                    <option value="dark">Dark Theme (Modern Slate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Window Size
                  </label>
                  <select
                    value={windowSize}
                    onChange={(e) => setWindowSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
                  >
                    <option value="compact">Compact (340px × 500px)</option>
                    <option value="standard">Standard (380px × 580px)</option>
                    <option value="large">Spacious (420px × 640px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Floating Launcher Icon
                  </label>
                  <select
                    value={launcherIcon}
                    onChange={(e) => setLauncherIcon(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
                  >
                    <option value="message">Chat Bubble Icon</option>
                    <option value="bot">Robot Icon</option>
                    <option value="sparkle">AI Sparkle Icon</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Welcome Greeting Message
                </label>
                <textarea
                  rows="2"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                ></textarea>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={customSaving}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {customSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Appearance Changes</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Changes are fetched dynamically by the widget without requiring code re-embedding.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
