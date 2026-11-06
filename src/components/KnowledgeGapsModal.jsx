import React, { useState, useEffect } from 'react';
import { 
  X, 
  HelpCircle, 
  UploadCloud, 
  Download, 
  RotateCw, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  ArrowUpRight,
  Filter,
  EyeOff
} from 'lucide-react';
import { fetchKnowledgeGaps, updateKnowledgeGapStatus, downloadExportCsv } from '../services/api';

export default function KnowledgeGapsModal({ isOpen, onClose, onOpenUpload }) {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadGaps();
    }
  }, [isOpen, statusFilter]);

  async function loadGaps() {
    try {
      setLoading(true);
      const res = await fetchKnowledgeGaps({ status: statusFilter });
      setGaps(res.gaps || []);
    } catch (err) {
      console.error('Failed to load knowledge gaps:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (gapId, newStatus) => {
    try {
      setUpdatingId(gapId);
      await updateKnowledgeGapStatus(gapId, newStatus);
      await loadGaps();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await downloadExportCsv('knowledge-gaps', {});
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden my-6 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Knowledge Gap Analysis</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {gaps.length} Inquiries
                </span>
              </div>
              <p className="text-xs text-slate-500">Track questions visitors asked that were missing from your document knowledge base</p>
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

        {/* Filters */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Filter Status:</span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
              {[
                { id: 'open', label: 'Open Gaps' },
                { id: 'addressed', label: 'Addressed' },
                { id: 'all', label: 'All Questions' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setStatusFilter(t.id)}
                  className={`px-3 py-1 rounded-md transition ${
                    statusFilter === t.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <span className="text-[11px] text-slate-400">
            Sorted by most frequently asked
          </span>
        </div>

        {/* Body List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-20 text-center space-y-2">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
              <p className="text-xs text-slate-400">Analyzing visitor questions against knowledge base...</p>
            </div>
          ) : gaps.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700">No knowledge gaps found!</p>
              <p className="text-slate-400">Your chatbots are answering visitor questions with verified document citations.</p>
            </div>
          ) : (
            gaps.map((gap) => (
              <div
                key={gap.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-200 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      "{gap.question}"
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-mono font-bold">
                      {gap.frequency || 1}× asked
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-medium flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      <Sparkles className="w-3 h-3" />
                      Suggested Topic: <strong>{gap.suggested_topic || 'Documentation'}</strong>
                    </span>
                    <span>• Status: <strong className="capitalize">{gap.status}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {gap.status === 'open' ? (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(gap.id, 'addressed')}
                        disabled={updatingId === gap.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Addressed</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(gap.id, 'ignored')}
                        disabled={updatingId === gap.id}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        title="Ignore gap"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleStatusUpdate(gap.id, 'open')}
                      disabled={updatingId === gap.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
