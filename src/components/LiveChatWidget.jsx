import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Trash2, 
  Bot, 
  User, 
  Sparkles, 
  ChevronDown, 
  RefreshCw, 
  ExternalLink, 
  Smile, 
  Server, 
  AlertCircle,
  FileText,
  BookOpen,
  Headphones,
  Star,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { initialMessages, getBotResponse } from '../data/demoChatResponses';
import { 
  sendChatMessage, 
  checkBackendHealth, 
  requestHumanHandoff, 
  submitConversationFeedback, 
  fetchPublicMessages 
} from '../services/api';

export default function LiveChatWidget({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 9));
  const [conversationId, setConversationId] = useState(null);
  const [activeBotId, setActiveBotId] = useState(null);
  const [conversationStatus, setConversationStatus] = useState('active'); // 'active' | 'handed_over' | 'resolved'
  const [requestingHandoff, setRequestingHandoff] = useState(false);
  
  // Feedback widget state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [useBackend, setUseBackend] = useState(true); // Default to Real AI Backend mode
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [networkError, setNetworkError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check backend server health on mount & when opened
  useEffect(() => {
    const testConnection = async () => {
      const res = await checkBackendHealth();
      setBackendStatus(res.online ? 'online' : 'offline');
    };
    testConnection();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : inputValue;
    if (!text.trim() || isTyping) return;

    setNetworkError(null);

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    if (typeof textToSend !== 'string') {
      setInputValue('');
    }
    setIsTyping(true);

    if (useBackend) {
      try {
        // Real AI Backend Flow: send message + history to Node Express API
        const responseData = await sendChatMessage({
          message: text.trim(),
          sessionId,
          history: updatedMessages.slice(0, -1) // prior messages context
        });

        if (responseData.conversationId) {
          setConversationId(responseData.conversationId);
        }
        if (responseData.bot?.id) {
          setActiveBotId(responseData.bot.id);
        }
        if (responseData.handoffTriggered) {
          setConversationStatus('handed_over');
        }

        const botMsg = {
          id: responseData.messageId || Date.now() + 1,
          sender: 'bot',
          text: responseData.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: responseData.model,
          apiUsed: responseData.apiUsed,
          sources: responseData.sources || [],
          grounded: responseData.grounded
        };

        setMessages((prev) => [...prev, botMsg]);
        setBackendStatus('online');
      } catch (err) {
        console.error('Chat API Error:', err);
        setNetworkError(err.message);
        setBackendStatus('offline');

        // Graceful error bubble with fallback option
        const errorMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `⚠️ Backend Connection Notice:\nCould not reach the AI backend server (${err.message}).\n\nPlease ensure your Node.js backend is running on port 5001, or switch to Demo Mode below.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    } else {
      // Demo Mode: predefined local simulation
      setTimeout(() => {
        const response = getBotResponse(text);
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: response.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          followUps: response.followUps
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 700);
    }
  };

  // Poll for human agent replies when handed over or active
  useEffect(() => {
    if (!isOpen || !activeBotId || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchPublicMessages(activeBotId, sessionId);
        if (data && data.messages) {
          if (data.status) setConversationStatus(data.status);
          if (data.conversationId && !conversationId) setConversationId(data.conversationId);

          const agentMessages = data.messages.filter(m => m.sender === 'agent');
          if (agentMessages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newAgentMsgs = agentMessages
                .filter(m => !existingIds.has(m.id))
                .map(m => ({
                  id: m.id,
                  sender: 'agent',
                  text: m.content,
                  time: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  agentName: m.metadata?.agentName || 'Staff Representative'
                }));
              if (newAgentMsgs.length > 0) {
                return [...prev, ...newAgentMsgs];
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // silent polling catch
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, activeBotId, sessionId, conversationId]);

  const handleRequestHandoff = async () => {
    if (conversationStatus === 'handed_over' || requestingHandoff) return;

    setRequestingHandoff(true);
    try {
      if (conversationId) {
        await requestHumanHandoff(conversationId, 'Website Visitor');
      }
      setConversationStatus('handed_over');

      const handoffNotice = {
        id: Date.now(),
        sender: 'system',
        text: '🔔 Human representative requested. A notification has been sent to our conversation inbox. A team member will join and respond here shortly. (Inquiries are handled in order of arrival).',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, handoffNotice]);
    } catch (err) {
      console.error('Handoff error:', err);
    } finally {
      setRequestingHandoff(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!conversationId) {
      setFeedbackSubmitted(true);
      return;
    }
    setSubmittingFeedback(true);
    try {
      await submitConversationFeedback(conversationId, {
        rating: feedbackRating,
        comment: feedbackComment,
        thumbsUp: feedbackRating >= 4
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Feedback submission error:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages(initialMessages);
    setNetworkError(null);
    setSessionId('sess_' + Math.random().toString(36).substring(2, 9));
    setConversationId(null);
    setConversationStatus('active');
    setFeedbackSubmitted(false);
    setShowFeedbackModal(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating launcher trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center gap-3 p-3.5 sm:px-4 sm:py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white rounded-full shadow-2xl hover:shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all duration-300"
          aria-label="Open BotFlow Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <span className="hidden sm:inline-block text-sm font-bold tracking-wide pr-1">
            Chat with BotFlow AI
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-rose-500 text-[11px] font-bold text-white flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-purple-200/80 flex flex-col overflow-hidden animate-slide-up transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-4 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-purple-800 ${
                    backendStatus === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  BotFlow AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                </h3>
                <p className="text-[11px] text-purple-200 flex items-center gap-1.5">
                  <span>{useBackend ? 'Real AI Mode (Backend)' : 'Interactive Demo Mode'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleRequestHandoff}
                disabled={conversationStatus === 'handed_over' || requestingHandoff}
                title={conversationStatus === 'handed_over' ? 'Agent already requested' : 'Request live human representative'}
                className={`p-1.5 rounded-lg transition ${
                  conversationStatus === 'handed_over'
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Headphones className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Handover Notice Banner */}
          {conversationStatus === 'handed_over' && (
            <div className="bg-amber-500/15 border-b border-amber-300/30 px-3.5 py-1.5 flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-1.5 font-medium text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>Agent Requested — In queue for live staff reply</span>
              </div>
              <span className="text-[10px] bg-amber-400/20 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                Live Queue
              </span>
            </div>
          )}

          {/* Subheader: Mode Switcher & Backend Health Pill */}
          <div className="bg-purple-50/80 border-b border-purple-100 px-3.5 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-900 text-[11px]">Mode:</span>
              <div className="inline-flex bg-white rounded-lg p-0.5 border border-purple-200 shadow-xs">
                <button
                  onClick={() => setUseBackend(true)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    useBackend
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-purple-700'
                  }`}
                >
                  Real AI Backend
                </button>
                <button
                  onClick={() => setUseBackend(false)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    !useBackend
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-purple-700'
                  }`}
                >
                  Demo Mode
                </button>
              </div>
            </div>

            {/* Backend connectivity indicator */}
            <div className="flex items-center gap-1.5 text-[10px] font-medium">
              {backendStatus === 'online' ? (
                <span className="text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  API :5001 Online
                </span>
              ) : backendStatus === 'offline' ? (
                <span className="text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  API Offline
                </span>
              ) : (
                <span className="text-slate-500">Checking...</span>
              )}
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed text-center shadow-xs">
                    {msg.text}
                  </div>
                );
              }

              const isBot = msg.sender === 'bot';
              const isAgent = msg.sender === 'agent';
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`flex items-start gap-2 max-w-[85%] ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {isAgent ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-xs">
                        <Headphones className="w-4 h-4" />
                      </div>
                    ) : isBot ? (
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-xs">
                        <User className="w-4 h-4" />
                      </div>
                    )}

                    <div>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                          msg.isError
                            ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-tl-xs'
                            : isAgent
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tl-xs'
                            : isBot
                            ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs'
                        }`}
                      >
                        {isAgent && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{msg.agentName || 'Staff Representative'}</span>
                          </div>
                        )}
                        {msg.text}
                      </div>

                      <div
                        className={`text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-2 ${
                          isUser ? 'text-right justify-end' : 'text-left'
                        }`}
                      >
                        <span>{msg.time}</span>
                        {isAgent && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                            Human Support
                          </span>
                        )}
                        {msg.model && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.2 rounded">
                            {msg.model}
                          </span>
                        )}
                        {msg.grounded && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                            Verified Citation
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grounded Document Sources / Citations */}
                  {isBot && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 ml-9 flex flex-wrap gap-1.5 max-w-[85%]">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-[10px] text-purple-800 bg-purple-50 border border-purple-200/90 px-2 py-0.5 rounded-lg shadow-2xs"
                        >
                          <BookOpen className="w-3 h-3 text-purple-600 shrink-0" />
                          <span className="font-semibold truncate max-w-[170px]">{src.title}</span>
                          {src.similarity && (
                            <span className="text-[9px] text-purple-500 font-mono">
                              ({Math.round(src.similarity * 100)}% match)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {isBot && msg.suggestions && (
                    <div className="mt-2.5 ml-9 flex flex-wrap gap-1.5 max-w-[90%]">
                      {msg.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(suggestion)}
                          className="text-[11px] font-medium bg-white hover:bg-purple-50 text-purple-700 border border-purple-200/80 hover:border-purple-300 px-2.5 py-1 rounded-full transition shadow-xs text-left"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Follow-up Chips */}
                  {isBot && msg.followUps && (
                    <div className="mt-2.5 ml-9 flex flex-wrap gap-1.5 max-w-[90%]">
                      {msg.followUps.map((followUp, index) => (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(followUp)}
                          className="text-[11px] font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full transition text-left"
                        >
                          ↳ {followUp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing / Loading Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2 max-w-[80%]">
                <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-purple-700 mr-1">
                      {useBackend ? 'AI Thinking...' : 'Typing...'}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Bar */}
          <div className="px-3 py-1.5 bg-slate-100/70 border-t border-slate-200/60 overflow-x-auto flex gap-1.5 no-scrollbar">
            <button
              onClick={() => handleSendMessage("How do I create a new chatbot?")}
              className="text-[10px] text-slate-600 bg-white hover:bg-purple-50 px-2.5 py-1 rounded-md border border-slate-200 shrink-0"
            >
              🤖 Create chatbot?
            </button>
            <button
              onClick={() => handleSendMessage("Can I upload PDF documents?")}
              className="text-[10px] text-slate-600 bg-white hover:bg-purple-50 px-2.5 py-1 rounded-md border border-slate-200 shrink-0"
            >
              📄 Upload PDF?
            </button>
            <button
              onClick={() => handleSendMessage("Show me the website embed code")}
              className="text-[10px] text-slate-600 bg-white hover:bg-purple-50 px-2.5 py-1 rounded-md border border-slate-200 shrink-0"
            >
              💻 Integration script?
            </button>
            <button
              onClick={() => handleSendMessage("Tell me about pricing plans")}
              className="text-[10px] text-slate-600 bg-white hover:bg-purple-50 px-2.5 py-1 rounded-md border border-slate-200 shrink-0"
            >
              🏷️ Pricing plans?
            </button>
          </div>

          {/* Visitor Satisfaction Feedback Bar */}
          {conversationId && (
            <div className="bg-purple-50/70 border-t border-purple-100 px-3.5 py-2">
              {feedbackSubmitted ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Thank you! Your feedback helps train our agents.</span>
                </div>
              ) : showFeedbackModal ? (
                <div className="w-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700">Rate this conversation:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className="p-0.5 text-amber-400 hover:scale-110 transition"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Optional feedback comment..."
                      className="flex-1 text-[11px] px-2.5 py-1 bg-white border border-purple-200 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={handleSubmitFeedback}
                      disabled={submittingFeedback}
                      className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-700 transition"
                    >
                      {submittingFeedback ? '...' : 'Send'}
                    </button>
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-slate-500">How was our assistant's response?</span>
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-800 bg-white px-2 py-0.5 rounded-md border border-purple-200 shadow-2xs hover:bg-purple-50 transition"
                  >
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>Rate Chat</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder={useBackend ? "Ask real AI chatbot (Express + OpenAI)..." : "Ask BotFlow AI anything..."}
              className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className={`p-2.5 rounded-xl transition shadow-xs ${
                inputValue.trim() && !isTyping
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Power by footer */}
          <div className="py-1 bg-white text-center border-t border-slate-50 flex items-center justify-center gap-1.5">
            <span className="text-[10px] text-slate-400">
              Powered by <span className="font-bold text-purple-600">BotFlow.ai</span> Backend
            </span>
            {useBackend && (
              <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                REST API Active
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
