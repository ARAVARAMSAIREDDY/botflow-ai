import React from 'react';
import { Sparkles, Play, ArrowRight, CheckCircle2, Bot, FileText, Zap, Globe, MessageSquare, Star } from 'lucide-react';

export default function Hero({ onOpenAuth, onOpenDemo, onOpenChat }) {
  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background ambient glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-[450px] h-[450px] bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-purple-200/30 rounded-full blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Top announcement badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 border border-purple-200 text-purple-800 text-xs sm:text-sm font-semibold mb-6 shadow-sm hover:bg-purple-100 transition-colors cursor-pointer">
            <span className="flex h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
            <span className="bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">
              BotFlow 2.0 Engine is Live
            </span>
            <span className="text-purple-400">|</span>
            <span className="text-purple-700 font-normal">Train on your custom docs</span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Build Your Own{' '}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
              AI Chatbot
            </span>{' '}
            in Minutes
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Create intelligent AI assistants for your website. Upload your business information, customize your chatbot and let AI handle customer questions 24/7.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 rounded-xl shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Sparkles className="w-5 h-5 text-purple-200" />
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm hover:border-purple-300 hover:text-purple-700 transition-all duration-200 group"
            >
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </div>
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Trust points */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>5-minute setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>100+ file formats supported</span>
            </div>
          </div>
        </div>

        {/* Hero Illustration / Interactive Mockup Preview */}
        <div className="mt-14 relative max-w-5xl mx-auto">
          {/* Outer glow container */}
          <div className="relative rounded-2xl p-2 sm:p-4 bg-gradient-to-b from-purple-200/60 via-purple-100/40 to-white/80 border border-purple-200/80 shadow-2xl shadow-purple-900/10 backdrop-blur-xl">
            {/* Top window mock controls */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-mono text-slate-400 bg-white px-3 py-1 rounded-md border border-slate-200/60">
                    https://yourdomain.com/assistant-preview
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Bot Online & Active
                </div>
              </div>

              {/* Mockup split screen */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
                {/* Left: Organization context / Knowledge inputs */}
                <div className="lg:col-span-5 p-6 bg-slate-50/40 border-r border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                        Active Knowledge Sources
                      </h4>
                      <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                        4 Sources Synced
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/70 shadow-xs hover:border-purple-300 transition">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            Company_FAQ_and_Policy.pdf
                          </p>
                          <p className="text-[11px] text-slate-400">42 pages • 98 chunks parsed</p>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Ready
                        </span>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/70 shadow-xs hover:border-purple-300 transition">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            https://yourbrand.com/products
                          </p>
                          <p className="text-[11px] text-slate-400">Crawled 18 pages • Auto-sync</p>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Live
                        </span>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/70 shadow-xs hover:border-purple-300 transition">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            Customer_Support_Guidelines.docx
                          </p>
                          <p className="text-[11px] text-slate-400">Tone: Friendly & Professional</p>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bot metrics badge */}
                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-purple-500/10 border border-purple-200/60">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-slate-700">Accuracy & Hallucination Guard</span>
                      <span className="font-bold text-purple-700">99.4%</span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-2">
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full w-[99.4%]" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Strict grounded responses only from your uploaded data.
                    </p>
                  </div>
                </div>

                {/* Right: Interactive Chat Preview Screen */}
                <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between bg-white">
                  {/* Chat header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                          <Bot className="w-5 h-5" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          BotFlow Assistant
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                            AI Verified
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400">Replies instantly in &lt; 0.6 seconds</p>
                      </div>
                    </div>
                    <button
                      onClick={onOpenChat}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition"
                    >
                      Try Live Chat 💬
                    </button>
                  </div>

                  {/* Messages Area */}
                  <div className="py-4 space-y-3.5">
                    {/* Bot Greeting */}
                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-slate-100/90 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs sm:text-sm leading-relaxed">
                        Hello! 👋 How can I help you today? I'm trained on your company's full knowledge base and can answer questions instantly.
                      </div>
                    </div>

                    {/* User Question */}
                    <div className="flex items-start justify-end gap-2.5">
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs sm:text-sm leading-relaxed max-w-[85%] shadow-sm">
                        Can you explain how students submit their scholarship applications before Friday?
                      </div>
                    </div>

                    {/* Bot Answer */}
                    <div className="flex items-start gap-2.5 max-w-[90%]">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-purple-50/70 border border-purple-100 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs sm:text-sm leading-relaxed">
                        <p className="font-semibold text-purple-900 mb-1">
                          From Scholarship Guidelines 2026 (Section 3.2):
                        </p>
                        Students should submit through the <strong>Student Portal &gt; Financial Aid &gt; Apply</strong>. Required docs include the 2025 W-2 and official transcripts. Submissions close Friday at 11:59 PM EST!
                      </div>
                    </div>
                  </div>

                  {/* Mock Input Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      placeholder="Ask a question or test responses..."
                      className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-600 focus:outline-none"
                    />
                    <button
                      onClick={onOpenChat}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:opacity-95 shadow-sm transition"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating floating highlight cards */}
            <div className="hidden sm:flex absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-purple-100 items-center gap-3 animate-float">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Star className="w-5 h-5 fill-purple-600 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">4.9 / 5 Rating</p>
                <p className="text-[11px] text-slate-500">Over 1,200+ organizations</p>
              </div>
            </div>

            <div className="hidden sm:flex absolute -top-6 -right-6 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-purple-100 items-center gap-3 animate-float" style={{ animationDelay: '1.5s' }}>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">0.4s Latency</p>
                <p className="text-[11px] text-slate-500">Ultra-fast AI streaming</p>
              </div>
            </div>
          </div>
        </div>

        {/* Organizations Bar / Supported Verticals */}
        <div className="mt-20 pt-10 border-t border-purple-100/60 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400 mb-6">
            Trusted by modern businesses, colleges, hospitals, and restaurants worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
            <span className="font-bold text-base sm:text-lg text-slate-700 flex items-center gap-2">
              🏥 MetroCare Health
            </span>
            <span className="font-bold text-base sm:text-lg text-slate-700 flex items-center gap-2">
              🎓 Horizon University
            </span>
            <span className="font-bold text-base sm:text-lg text-slate-700 flex items-center gap-2">
              🍽️ BellaCucina Dining
            </span>
            <span className="font-bold text-base sm:text-lg text-slate-700 flex items-center gap-2">
              🛍️ Trendify Retail
            </span>
            <span className="font-bold text-base sm:text-lg text-slate-700 flex items-center gap-2">
              ⚡ NovaCloud SaaS
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
