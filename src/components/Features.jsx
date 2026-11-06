import React, { useState } from 'react';
import { 
  Bot, 
  FileUp, 
  Globe, 
  Clock, 
  Palette, 
  History, 
  Layers, 
  Code2, 
  Sparkles, 
  Check, 
  ArrowRight 
} from 'lucide-react';

export default function Features({ onOpenEmbed, onOpenChat }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const features = [
    {
      id: 'ai-chat',
      category: 'core',
      title: 'AI-Powered Conversations',
      description: 'Human-like conversational intelligence that understands context, subtleties, and business terminology flawlessly.',
      icon: Bot,
      color: 'from-purple-500 to-indigo-500',
      tag: 'Next-Gen LLM',
      stats: 'Human-parity answers'
    },
    {
      id: 'pdf-upload',
      category: 'knowledge',
      title: 'Upload PDF & Documents',
      description: 'Easily ingest PDFs, Word documents, text manuals, spreadsheets, and policies. Automatic chunking and vector indexing.',
      icon: FileUp,
      color: 'from-blue-500 to-cyan-500',
      tag: 'Multi-Format',
      stats: 'PDF, DOCX, CSV, TXT'
    },
    {
      id: 'web-sync',
      category: 'knowledge',
      title: 'Website Knowledge Integration',
      description: 'Crawl your public site, help center, or documentation with one URL. Auto-syncs whenever you update your pages.',
      icon: Globe,
      color: 'from-violet-500 to-purple-600',
      tag: 'Auto-Sync',
      stats: 'Scheduled web re-crawling'
    },
    {
      id: 'support-24-7',
      category: 'core',
      title: '24/7 Customer Support',
      description: 'Never miss an inquiry again. Resolve customer support tickets at 3 AM with zero delay and instant escalation when needed.',
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      tag: 'Zero Downtime',
      stats: '99.99% uptime guarantee'
    },
    {
      id: 'branding',
      category: 'customization',
      title: 'Custom Chatbot Branding',
      description: 'Tailor your widget with company colors, logos, custom avatars, welcome messages, and branded CSS styling.',
      icon: Palette,
      color: 'from-pink-500 to-rose-500',
      tag: 'White-Label',
      stats: 'Full color & CSS control'
    },
    {
      id: 'history',
      category: 'analytics',
      title: 'Conversation History & Analytics',
      description: 'Deep dive into user queries, monitor sentiment trends, inspect chat logs, and pinpoint unanswered questions.',
      icon: History,
      color: 'from-indigo-500 to-blue-600',
      tag: 'Actionable Insights',
      stats: 'Full transcripts & export'
    },
    {
      id: 'multi-bot',
      category: 'customization',
      title: 'Multiple Chatbot Management',
      description: 'Deploy separate, specialized bots across departments: Sales, Admissions, Patient Support, or Internal IT.',
      icon: Layers,
      color: 'from-emerald-500 to-teal-500',
      tag: 'Multi-Tenant',
      stats: 'Isolated knowledge bases'
    },
    {
      id: 'embed',
      category: 'deployment',
      title: 'Easy Website Integration',
      description: 'Embed your bot with a single line of script. Fully compatible with WordPress, Shopify, React, Next.js, and Webflow.',
      icon: Code2,
      color: 'from-purple-600 to-pink-600',
      tag: '1-Line Embed',
      stats: 'Under 10KB bundle size'
    }
  ];

  const filteredFeatures = activeFilter === 'all' 
    ? features 
    : features.filter(f => f.category === activeFilter || activeFilter === 'all');

  return (
    <section id="features" className="py-24 bg-white relative">
      {/* Decorative gradient blur */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Cutting-Edge Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Everything You Need to Build <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
              Intelligent Website Assistants
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            From raw document ingestion to multi-channel deployment, BotFlow gives you complete control over your conversational AI.
          </p>

          {/* Filter Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: 'All Features' },
              { id: 'knowledge', label: 'Knowledge & Ingestion' },
              { id: 'customization', label: 'Branding & Multiple Bots' },
              { id: 'core', label: 'Conversational Core' },
              { id: 'deployment', label: 'Deployment & Code' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
                  activeFilter === tab.id
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group relative bg-slate-50/70 hover:bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Icon & Tag */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${feature.color} flex items-center justify-center text-white shadow-md shadow-purple-500/15 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide text-purple-700 bg-purple-50 border border-purple-100/80 px-2.5 py-1 rounded-full">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    {feature.stats}
                  </span>
                  {feature.id === 'embed' && (
                    <button
                      onClick={onOpenEmbed}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 hover:underline"
                    >
                      View code <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {feature.id === 'ai-chat' && (
                    <button
                      onClick={onOpenChat}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 hover:underline"
                    >
                      Test live <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Highlight Banner */}
        <div className="mt-16 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-2xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <span className="text-xs uppercase tracking-widest font-bold text-purple-300 bg-purple-800/60 px-3 py-1 rounded-full">
                Zero Hallucination Guarantee
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold mt-3">
                Ground your AI strictly to your uploaded documents
              </h3>
              <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Unlike generic LLMs that guess answers, BotFlow AI restricts answers exclusively to the files and website pages you provide. If an answer isn't in your docs, the bot politely clarifies or routes to your team.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <button
                onClick={onOpenChat}
                className="w-full text-center px-6 py-3 bg-white text-purple-900 rounded-xl font-bold text-sm hover:bg-purple-50 transition shadow-lg"
              >
                Test With Live Bot
              </button>
              <button
                onClick={onOpenEmbed}
                className="w-full text-center px-6 py-3 bg-purple-800/80 hover:bg-purple-800 border border-purple-700/80 text-white rounded-xl font-bold text-sm transition"
              >
                Get Embed Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
