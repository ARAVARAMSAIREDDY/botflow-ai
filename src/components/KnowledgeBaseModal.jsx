import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Globe, 
  FileText, 
  FileCode, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles,
  Layers,
  Database,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { 
  getChatbotKnowledge, 
  uploadDocumentFile, 
  addWebsiteUrl, 
  deleteKnowledgeSource, 
  reindexKnowledgeSource 
} from '../services/api';

export default function KnowledgeBaseModal({ isOpen, onClose, chatbot, chatbots = [] }) {
  const [selectedBotId, setSelectedBotId] = useState(chatbot?.id || (chatbots[0]?.id || ''));
  const [knowledgeData, setKnowledgeData] = useState({ sources: [], stats: { totalSources: 0, totalChunks: 0 } });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  
  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [submittingUrl, setSubmittingUrl] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [reindexingId, setReindexingId] = useState(null);

  useEffect(() => {
    if (chatbot?.id) {
      setSelectedBotId(chatbot.id);
    }
  }, [chatbot]);

  // Fetch knowledge sources for current bot
  const fetchSources = async (botId) => {
    if (!botId) return;
    try {
      setLoading(true);
      const data = await getChatbotKnowledge(botId);
      setKnowledgeData(data);
    } catch (err) {
      console.warn('Could not fetch backend knowledge:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedBotId) {
      fetchSources(selectedBotId);
      const interval = setInterval(() => {
        // Poll status if any source is processing
        fetchSources(selectedBotId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, selectedBotId]);

  if (!isOpen) return null;

  // File drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleValidateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleValidateAndSetFile(e.target.files[0]);
    }
  };

  const handleValidateAndSetFile = (file) => {
    setUploadError(null);
    const validExtensions = ['pdf', 'docx', 'csv', 'txt', 'md'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      setUploadError(`Unsupported file format ".${ext}". Please upload a PDF, DOCX, CSV, or TXT file.`);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15 MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedBotId) return;

    try {
      setUploading(true);
      setUploadProgress(20);
      setUploadError(null);

      const simInterval = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 20 : p));
      }, 250);

      await uploadDocumentFile(selectedBotId, selectedFile);

      clearInterval(simInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setSelectedFile(null);
        setUploading(false);
        setUploadProgress(0);
        fetchSources(selectedBotId);
      }, 600);
    } catch (err) {
      setUploadError(err.message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim() || !selectedBotId) return;

    try {
      setSubmittingUrl(true);
      setUrlError(null);
      await addWebsiteUrl(selectedBotId, urlInput.trim());
      setUrlInput('');
      fetchSources(selectedBotId);
    } catch (err) {
      setUrlError(err.message);
    } finally {
      setSubmittingUrl(false);
    }
  };

  const handleDelete = async (sourceId) => {
    if (!confirm('Are you sure you want to delete this knowledge source and remove its vector embeddings?')) return;
    try {
      await deleteKnowledgeSource(sourceId);
      fetchSources(selectedBotId);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleReindex = async (sourceId) => {
    try {
      setReindexingId(sourceId);
      await reindexKnowledgeSource(sourceId);
      fetchSources(selectedBotId);
    } catch (err) {
      alert(`Reindexing error: ${err.message}`);
    } finally {
      setReindexingId(null);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return 'Web Page';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const currentBot = chatbots.find(b => b.id === selectedBotId) || chatbot;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                Knowledge Base & RAG Engine
                <span className="text-[10px] bg-purple-900/80 text-purple-300 border border-purple-700/60 font-semibold px-2 py-0.5 rounded-full">
                  pgvector + text-embedding-3
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Upload PDFs, Word docs, CSVs, or crawl websites to ground your AI assistant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bot Selector & Stats Bar */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-400">Target Chatbot:</label>
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              {chatbots.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.mode === 'knowledge' ? 'Knowledge Mode' : 'General Mode'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Sources:</span>
              <span className="font-bold text-white">{knowledgeData.stats?.totalSources || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Vector Chunks:</span>
              <span className="font-bold text-emerald-400">{knowledgeData.stats?.totalChunks || 0}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Isolated Tenant Space</span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Action Tabs: Upload vs URL */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'upload'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Documents (PDF / DOCX / CSV / TXT)</span>
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'url'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Add Website URL</span>
              </button>
            </div>

            {/* TAB 1: Document Upload */}
            {activeTab === 'upload' && (
              <div>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition ${
                    dragActive
                      ? 'border-purple-500 bg-purple-950/30'
                      : 'border-slate-700 bg-slate-900/60 hover:border-purple-500/70 hover:bg-slate-900'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.csv,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud className="w-10 h-10 text-purple-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm font-bold text-white">
                    {selectedFile ? selectedFile.name : 'Drag and drop your file here, or click to browse'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF, DOCX, CSV, TXT (Maximum file size: 15MB)
                  </p>
                  {selectedFile && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-purple-950/80 border border-purple-700 text-purple-200 rounded-lg text-xs font-medium">
                      <span>{selectedFile.name}</span>
                      <span className="text-slate-400">({formatBytes(selectedFile.size)})</span>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploading && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Ingesting document & generating embeddings...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {selectedFile && !uploading && (
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUploadSubmit}
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-md transition"
                    >
                      Start Ingestion & Chunking
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Website URL Ingestion */}
            {activeTab === 'url' && (
              <div>
                <form onSubmit={handleUrlSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Website URL to Crawl & Index
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        placeholder="https://example.com/support or https://docs.yourbrand.com"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="submit"
                        disabled={submittingUrl || !urlInput.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:opacity-90 transition shrink-0"
                      >
                        {submittingUrl ? 'Scraping...' : 'Crawl & Index'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5 text-purple-300 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      SSRF Safe Crawler
                    </p>
                    <p>
                      Our crawler automatically sanitizes HTML, strips navigation, ads, and cookies, and blocks private local IP access.
                    </p>
                  </div>

                  {urlError && (
                    <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{urlError}</span>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Sources List Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Indexed Knowledge Sources ({knowledgeData.sources?.length || 0})
              </h4>
              <button
                onClick={() => fetchSources(selectedBotId)}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {knowledgeData.sources && knowledgeData.sources.length > 0 ? (
              <div className="space-y-2.5">
                {knowledgeData.sources.map((source) => (
                  <div
                    key={source.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800/80 text-purple-400 flex items-center justify-center shrink-0">
                        {source.source_type === 'url' ? (
                          <Globe className="w-5 h-5 text-blue-400" />
                        ) : source.source_type === 'pdf' ? (
                          <FileText className="w-5 h-5 text-rose-400" />
                        ) : (
                          <FileCode className="w-5 h-5 text-purple-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h5 className="text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
                          {source.title}
                        </h5>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="uppercase text-[10px] font-bold text-purple-400 bg-purple-950 px-1.5 py-0.2 rounded border border-purple-800">
                            {source.source_type}
                          </span>
                          <span>•</span>
                          <span>{formatBytes(source.file_size_bytes)}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">
                            {source.chunk_count || 0} chunks
                          </span>
                          <span>•</span>
                          <span>{new Date(source.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                          source.status === 'ready'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : source.status === 'processing'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {source.status === 'ready' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {source.status === 'processing' && <Clock className="w-3 h-3 text-amber-400 animate-spin" />}
                        {source.status === 'failed' && <AlertCircle className="w-3 h-3 text-rose-400" />}
                        <span className="capitalize">{source.status}</span>
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReindex(source.id)}
                          title="Re-index document chunks"
                          disabled={reindexingId === source.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <RefreshCw className={`w-4 h-4 ${reindexingId === source.id ? 'animate-spin text-purple-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(source.id)}
                          title="Delete source and vectors"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                No knowledge documents uploaded yet for "{currentBot?.name}". Upload a PDF or add a website URL above to enable grounded AI answers.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Grounded retrieval strictly isolates documents per chatbot.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
