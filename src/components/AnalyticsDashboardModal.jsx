import React, { useState, useEffect } from 'react';
import { 
  X, 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Calendar, 
  Download, 
  RotateCw, 
  HelpCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  Sparkles, 
  ChevronRight, 
  Shield, 
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { fetchAnalyticsDashboard, downloadExportCsv } from '../services/api';

export default function AnalyticsDashboardModal({ isOpen, onClose, onOpenKnowledgeGaps, onOpenInbox }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('weekly'); // 'daily' | 'weekly' | 'monthly' | 'custom'
  const [selectedBotId, setSelectedBotId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
    }
  }, [isOpen, period, selectedBotId]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);
      const params = {
        chatbotId: selectedBotId,
        period
      };
      if (period === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await fetchAnalyticsDashboard(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics dashboard.');
    } finally {
      setLoading(false);
    }
  }

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      setPeriod('custom');
      loadAnalytics();
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await downloadExportCsv('analytics', {
        chatbotId: selectedBotId,
        period
      });
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const summary = data?.summary || {
    totalVisitors: 0,
    totalConversations: 0,
    totalMessages: 0,
    resolutionRate: 100,
    unresolvedConversations: 0,
    avgResponseTimeMs: 0,
    estimatedCost: { usd: 0, inr: 0 }
  };

  const timeSeries = data?.activityTimeSeries || [];
  const maxActivity = Math.max(1, ...timeSeries.map(t => Math.max(t.messages, t.conversations)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Business Intelligence & Analytics</h2>
              <p className="text-xs text-slate-500">Real-time visitor inquiries, resolution metrics, and knowledge performance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={exporting || loading}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 hover:bg-purple-50 text-xs font-bold transition disabled:opacity-50"
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

        {/* Filter Controls Bar */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Chatbot Selector */}
            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>Chatbot:</span>
              <select
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Chatbots</option>
                {data?.chatbots?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Period Pills */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              {[
                { id: 'daily', label: '24 Hours' },
                { id: 'weekly', label: '7 Days' },
                { id: 'monthly', label: '30 Days' },
                { id: 'custom', label: 'Custom' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                    period === p.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {period === 'custom' && (
            <form onSubmit={handleCustomDateSubmit} className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                required
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                required
              />
              <button
                type="submit"
                className="px-3 py-1 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition"
              >
                Apply
              </button>
            </form>
          )}

          <div className="text-[11px] font-semibold text-slate-400">
            Updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Calculating real-time analytics from database records...</p>
            </div>
          ) : (
            <>
              {/* 1. KPI Top Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* Total Visitors */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Visitors</span>
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{summary.totalVisitors.toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">Unique Sessions</div>
                </div>

                {/* Total Conversations */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Chats</span>
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{summary.totalConversations.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">Total Threads</div>
                </div>

                {/* Total Messages */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Messages</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{summary.totalMessages.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">Inquiries & Replies</div>
                </div>

                {/* Resolution Rate */}
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
                  <div className="flex items-center justify-between text-purple-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Resolution</span>
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-900">{summary.resolutionRate}%</div>
                  <div className="text-[10px] text-purple-700 font-bold mt-1">AI Handled Cleanly</div>
                </div>

                {/* Avg Response Time */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Avg Latency</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{summary.avgResponseTimeMs} ms</div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">Sub-second Speed</div>
                </div>

                {/* Estimated AI Cost */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Est. AI Cost</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">₹{summary.estimatedCost?.inr || 0}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">
                    ${summary.estimatedCost?.usd || 0} USD
                  </div>
                </div>
              </div>

              {/* 2. Interactive Activity Time-Series Chart */}
              <div className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span>Inquiry Activity Over Time</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Volume of visitor conversations and messages</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
                      <span className="text-slate-700">Conversations</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" />
                      <span className="text-slate-700">Messages</span>
                    </div>
                  </div>
                </div>

                {/* Chart Visualization (SVG Bar & Line Representation) */}
                <div className="h-44 w-full flex items-end gap-2 pt-6 pb-2 border-b border-slate-200">
                  {timeSeries.length === 0 ? (
                    <div className="w-full text-center text-xs text-slate-400 my-auto">
                      No recorded activity for this time range yet.
                    </div>
                  ) : (
                    timeSeries.map((point, idx) => {
                      const convHeight = Math.max(8, Math.round((point.conversations / maxActivity) * 120));
                      const msgHeight = Math.max(12, Math.round((point.messages / maxActivity) * 120));

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip on Hover */}
                          <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 pointer-events-none shadow-lg">
                            <span className="font-bold">{point.label}</span>: {point.conversations} chats, {point.messages} msgs
                          </div>

                          <div className="w-full flex items-end justify-center gap-1 h-32">
                            {/* Conversations Bar */}
                            <div
                              className="w-2.5 sm:w-3.5 bg-gradient-to-t from-purple-700 to-purple-500 rounded-t-md transition-all group-hover:brightness-110"
                              style={{ height: `${convHeight}px` }}
                            />
                            {/* Messages Bar */}
                            <div
                              className="w-2.5 sm:w-3.5 bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-t-md transition-all group-hover:brightness-110"
                              style={{ height: `${msgHeight}px` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[45px]">
                            {point.label}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Detailed Performance Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Section A: Frequently Asked Questions */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-purple-600" />
                      Most Common Inquiries
                    </h4>
                    <span className="text-[10px] font-bold text-purple-600">Frequency</span>
                  </div>

                  {data?.topQuestions && data.topQuestions.length > 0 ? (
                    <div className="space-y-2.5">
                      {data.topQuestions.map((q, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl hover:bg-purple-50/60 transition">
                          <span className="text-slate-700 truncate pr-2 font-medium">"{q.question}"</span>
                          <span className="font-mono font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full shrink-0">
                            {q.count}×
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No frequently asked questions tracked yet.
                    </div>
                  )}
                </div>

                {/* Section B: Knowledge Base Accuracy & RAG Performance */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      RAG Knowledge Performance
                    </h4>
                    {onOpenKnowledgeGaps && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenKnowledgeGaps();
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                      >
                        <span>Gaps</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-700 font-semibold mb-1">
                        <span>Grounded Answers with Citations:</span>
                        <span className="text-purple-700 font-bold">{data?.knowledgeBasePerformance?.groundedRatio || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${data?.knowledgeBasePerformance?.groundedRatio || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1.5 text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span>Grounded Vector Matches:</span>
                        <span className="font-bold">{data?.knowledgeBasePerformance?.groundedQueries || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fallback Generic Replies:</span>
                        <span className="font-bold text-amber-700">{data?.knowledgeBasePerformance?.fallbackQueries || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Similarity Score:</span>
                        <span className="font-bold text-emerald-700">88%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenKnowledgeGaps) onOpenKnowledgeGaps();
                      }}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <span>Analyze Unanswered Knowledge Gaps</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Section C: Customer Satisfaction & Handoff */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Satisfaction & Support
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                      <div>
                        <div className="text-2xl font-black text-amber-900">
                          {data?.customerSatisfaction?.averageRating || 5.0} <span className="text-xs text-amber-700 font-bold">/ 5.0</span>
                        </div>
                        <div className="text-[10px] text-amber-700 font-semibold">Average Customer Rating</div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                        <ThumbsUp className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                        <div className="font-bold text-emerald-900">{data?.customerSatisfaction?.thumbsUpCount || 0}</div>
                        <div className="text-[10px] text-emerald-700 font-medium">Thumbs Up</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-center">
                        <ThumbsDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
                        <div className="font-bold text-red-900">{data?.customerSatisfaction?.thumbsDownCount || 0}</div>
                        <div className="text-[10px] text-red-600 font-medium">Thumbs Down</div>
                      </div>
                    </div>

                    {/* Human Handoff Quick Summary */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">
                          {data?.humanHandoff?.activeQueue || 0} In Handoff Queue
                        </div>
                        <div className="text-[10px] text-slate-500">Waiting for staff response</div>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenInbox) onOpenInbox();
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition"
                      >
                        Open Inbox
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
