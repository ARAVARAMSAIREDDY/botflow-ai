import React, { useState, useEffect } from 'react';
import { 
  X, 
  Inbox, 
  Search, 
  Filter, 
  Send, 
  User, 
  Bot, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Headphones, 
  FileText, 
  MessageSquare,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  fetchConversationsList, 
  fetchConversationTranscript, 
  updateConversationStatus, 
  sendAgentReply, 
  downloadExportCsv 
} from '../services/api';

export default function ConversationInboxModal({ isOpen, onClose, initialConversationId = null }) {
  const [conversations, setConversations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBotId, setSelectedBotId] = useState('all');
  const [loadingList, setLoadingList] = useState(false);

  // Active Selected Conversation Transcript
  const [selectedConvId, setSelectedConvId] = useState(initialConversationId);
  const [activeTranscript, setActiveTranscript] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Human Agent Reply input
  const [agentMessage, setAgentMessage] = useState('');
  const [agentName, setAgentName] = useState('Staff Representative');
  const [sendingReply, setSendingReply] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, page, statusFilter, selectedBotId]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConvId(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (selectedConvId) {
      loadTranscript(selectedConvId);
    } else {
      setActiveTranscript(null);
    }
  }, [selectedConvId]);

  async function loadConversations() {
    try {
      setLoadingList(true);
      const res = await fetchConversationsList({
        status: statusFilter,
        search: searchQuery,
        chatbotId: selectedBotId,
        page,
        limit: 15
      });
      setConversations(res.conversations || []);
      setTotalCount(res.totalCount || 0);
      setTotalPages(res.totalPages || 1);

      // Auto-select first conversation if none selected
      if (!selectedConvId && res.conversations && res.conversations.length > 0) {
        setSelectedConvId(res.conversations[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadTranscript(convId) {
    try {
      setLoadingTranscript(true);
      setActionError(null);
      const data = await fetchConversationTranscript(convId);
      setActiveTranscript(data);
    } catch (err) {
      console.error('Failed to load transcript:', err);
      setActionError(err.message || 'Failed to load transcript.');
    } finally {
      setLoadingTranscript(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadConversations();
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedConvId) return;
    try {
      await updateConversationStatus(selectedConvId, newStatus);
      await loadTranscript(selectedConvId);
      await loadConversations();
    } catch (err) {
      setActionError(err.message || 'Failed to update conversation status.');
    }
  };

  const handleSendAgentReply = async (e) => {
    e.preventDefault();
    if (!selectedConvId || !agentMessage.trim()) return;

    try {
      setSendingReply(true);
      setActionError(null);
      await sendAgentReply(selectedConvId, {
        message: agentMessage.trim(),
        agentName
      });
      setAgentMessage('');
      await loadTranscript(selectedConvId);
      await loadConversations();
    } catch (err) {
      setActionError(err.message || 'Failed to dispatch agent reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await downloadExportCsv('conversations', {
        chatbotId: selectedBotId,
        status: statusFilter
      });
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Conversation Management & Support Inbox</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {totalCount} Threads
                </span>
              </div>
              <p className="text-xs text-slate-500">Live transcripts, visitor inquiries, resolution tools & human handoff</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-purple-300 text-slate-700 text-xs font-bold transition disabled:opacity-50"
            >
              {exporting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split Pane Main Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Pane: Conversation List */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50">
            {/* Search and Filters */}
            <div className="p-3.5 border-b border-slate-200 space-y-2 bg-white">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search visitor or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                />
              </form>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'handed_over', label: 'Handoff', alert: true },
                  { id: 'active', label: 'Active' },
                  { id: 'resolved', label: 'Resolved' },
                  { id: 'closed', label: 'Closed' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
                      statusFilter === tab.id
                        ? tab.alert
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List Scroll Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingList ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto text-purple-600" />
                  <span>Loading conversations...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No conversations match your filter.
                </div>
              ) : (
                conversations.map(conv => {
                  const isSelected = conv.id === selectedConvId;
                  const isHandoff = conv.status === 'handed_over';
                  const isResolved = conv.status === 'resolved';

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full text-left p-3.5 transition flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-purple-50/90 border-l-4 border-purple-600'
                          : 'hover:bg-slate-100/70 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 truncate max-w-[170px]">
                          {conv.user_identifier || `Visitor ${conv.session_id?.slice(0, 8)}`}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatDate(conv.updated_at || conv.created_at)}
                        </span>
                      </div>

                      {/* Snippet */}
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {conv.lastMessage?.content || 'New conversation session started.'}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="text-slate-400 font-semibold">
                          {conv.messageCount || 0} msgs
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                          isHandoff
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : isResolved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {conv.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            <div className="p-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs font-semibold text-slate-600">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Pane: Conversation Transcript View & Staff Actions */}
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            {!selectedConvId || !activeTranscript ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
                <div>
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Select a conversation thread from the left</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Inspect full visitor inquiries, citations, and respond as a human agent</p>
                </div>
              </div>
            ) : (
              <>
                {/* Active Transcript Header Toolbar */}
                <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {activeTranscript.user_identifier || 'Website Visitor'}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        activeTranscript.status === 'handed_over'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : activeTranscript.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {activeTranscript.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Session ID: {activeTranscript.session_id} • Started: {formatDate(activeTranscript.created_at)}
                    </p>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {activeTranscript.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange('resolved')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mark Resolved</span>
                      </button>
                    )}

                    {activeTranscript.status === 'resolved' && (
                      <button
                        onClick={() => handleStatusChange('active')}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition"
                      >
                        Reopen
                      </button>
                    )}

                    {activeTranscript.status !== 'closed' && (
                      <button
                        onClick={() => handleStatusChange('closed')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>

                {actionError && (
                  <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium">
                    {actionError}
                  </div>
                )}

                {/* Handoff Notice Banner if thread requested human support */}
                {activeTranscript.status === 'handed_over' && (
                  <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <strong>Human Support Requested:</strong> Visitor is waiting for a staff reply.
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-700 font-bold uppercase">Priority Attention</span>
                  </div>
                )}

                {/* Messages Bubbles Area */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {loadingTranscript ? (
                    <div className="py-20 text-center text-xs text-slate-400">
                      <RotateCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                      <span>Loading conversation history...</span>
                    </div>
                  ) : activeTranscript.messages?.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400">
                      No messages recorded in this conversation yet.
                    </div>
                  ) : (
                    activeTranscript.messages?.map((msg, i) => {
                      const isUser = msg.sender === 'user';
                      const isAgent = msg.sender === 'agent';
                      const isSystem = msg.sender === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id || i} className="flex justify-center">
                            <span className="px-3 py-1 rounded-full bg-slate-200/80 text-[10px] text-slate-600 font-semibold">
                              {msg.content} • {formatDate(msg.created_at)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id || i}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-semibold">
                            {isUser ? (
                              <span>Visitor</span>
                            ) : isAgent ? (
                              <span className="text-purple-700 font-bold flex items-center gap-1">
                                <Headphones className="w-3 h-3" />
                                {msg.metadata?.agentName || 'Staff Agent'}
                              </span>
                            ) : (
                              <span className="text-indigo-600 font-bold flex items-center gap-1">
                                <Bot className="w-3 h-3" />
                                BotFlow AI
                              </span>
                            )}
                            <span>• {formatDate(msg.created_at)}</span>
                          </div>

                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                              isUser
                                ? 'bg-purple-600 text-white rounded-br-none'
                                : isAgent
                                ? 'bg-purple-100 text-purple-950 border border-purple-200 rounded-bl-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>

                            {/* Citations if Bot grounded reply */}
                            {msg.metadata?.citations?.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                                <span className="text-[10px] font-bold uppercase text-purple-600 block">
                                  Knowledge Sources Used:
                                </span>
                                {msg.metadata.citations.map((c, cIdx) => (
                                  <div key={cIdx} className="text-[10px] text-slate-500 bg-slate-50 p-1 rounded font-mono truncate">
                                    [Source {cIdx + 1}] {c.title}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom: Human Agent Live Response Box */}
                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                  <form onSubmit={handleSendAgentReply} className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold flex items-center gap-1 text-purple-700">
                        <Headphones className="w-3.5 h-3.5" />
                        Reply as Staff Agent:
                      </span>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Agent Name"
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-800"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <textarea
                        rows={2}
                        value={agentMessage}
                        onChange={(e) => setAgentMessage(e.target.value)}
                        placeholder="Type a human response to the visitor..."
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 resize-none"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !agentMessage.trim()}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {sendingReply ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>Send</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Notice: Your agent reply will immediately appear in the visitor's live chat session.
                    </p>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
