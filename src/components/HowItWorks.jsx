import React, { useState } from 'react';
import { UserCheck, UploadCloud, Sliders, Code, CheckCircle, Copy, Check, ArrowRight } from 'lucide-react';

export default function HowItWorks({ onOpenAuth, onOpenEmbed }) {
  const [activeStep, setActiveStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const steps = [
    {
      step: 1,
      title: 'Create Your Account',
      subtitle: 'Get started in 30 seconds',
      description: 'Sign up for free with your work email or Google workspace. No credit card or developer knowledge required.',
      icon: UserCheck,
      color: 'from-purple-500 to-indigo-600',
      badge: 'Step 1: Setup'
    },
    {
      step: 2,
      title: 'Upload Documents or Provide Website',
      subtitle: 'Teach AI your business knowledge',
      description: 'Upload your PDF handbooks, FAQs, product catalogs, or simply paste your website URL. BotFlow AI indexes and organizes your content instantly.',
      icon: UploadCloud,
      color: 'from-indigo-500 to-blue-600',
      badge: 'Step 2: Training'
    },
    {
      step: 3,
      title: 'Customize Your Chatbot',
      subtitle: 'Match your exact brand identity',
      description: 'Choose your bot’s personality, colors, welcome message, avatar, tone of voice, and suggested questions.',
      icon: Sliders,
      color: 'from-blue-600 to-teal-500',
      badge: 'Step 3: Styling'
    },
    {
      step: 4,
      title: 'Copy & Paste Integration Code',
      subtitle: 'Go live on any site in 1 click',
      description: 'Copy a single line of JavaScript and paste it into WordPress, Shopify, React, Webflow, or custom HTML.',
      icon: Code,
      color: 'from-emerald-500 to-green-600',
      badge: 'Step 4: Launch'
    }
  ];

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(
      '<script src="https://cdn.botflow.ai/v1/widget.js" data-bot-id="bf_live_948a2" async></script>'
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-white via-purple-50/40 to-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100/70 px-3.5 py-1 rounded-full">
            Simple 4-Step Process
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            How BotFlow AI Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Deploy an enterprise-grade AI chatbot on your website in four straightforward steps.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((item) => {
            const Icon = item.icon;
            const isSelected = activeStep === item.step;
            return (
              <div
                key={item.step}
                onClick={() => setActiveStep(item.step)}
                className={`cursor-pointer rounded-2xl p-6 transition-all duration-300 relative border ${
                  isSelected
                    ? 'bg-white border-purple-500 shadow-xl shadow-purple-600/10 -translate-y-1'
                    : 'bg-white/80 border-slate-200/80 hover:border-purple-200 hover:shadow-md'
                }`}
              >
                {/* Step number badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-tr ${item.color} shadow-md`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-2xl font-black ${
                      isSelected ? 'text-purple-600' : 'text-slate-300'
                    }`}
                  >
                    0{item.step}
                  </span>
                </div>

                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-1">
                  {item.badge}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">{item.subtitle}</p>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-purple-700' : 'text-slate-400'
                    }`}
                  >
                    {isSelected ? 'Active Preview' : 'Click to inspect'}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-purple-600 animate-ping' : 'bg-slate-300'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Interactive Step Interactive Preview Box */}
        <div className="mt-12 bg-white rounded-2xl border border-purple-200 shadow-lg p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              <h4 className="text-sm font-bold text-slate-800">
                Interactive Preview: Step {activeStep} &mdash; {steps[activeStep - 1].title}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveStep(s)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                    activeStep === s
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-purple-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Step 1 Preview Content */}
          {activeStep === 1 && (
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h5 className="text-lg font-bold text-slate-900">Sign Up in 30 Seconds</h5>
                <p className="text-sm text-slate-600 mt-2">
                  No credit card required. You get an immediate live environment to test chatbot creation, upload sample docs, and embed widgets.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Free sandbox with 100 messages included
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Instant workspace creation with team invites
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Google and Microsoft single-sign-on
                  </div>
                </div>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-purple-700 transition shadow-sm"
                >
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Work Email</label>
                    <input
                      type="text"
                      readOnly
                      value="alex@yourcompany.com"
                      className="mt-1 w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Company Name</label>
                    <input
                      type="text"
                      readOnly
                      value="Acme Corp"
                      className="mt-1 w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg text-xs text-purple-800">
                    🎉 Free tier activated: 1 bot ready to customize!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Preview Content */}
          {activeStep === 2 && (
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h5 className="text-lg font-bold text-slate-900">Upload Knowledge Documents or Sync URL</h5>
                <p className="text-sm text-slate-600 mt-2">
                  Drag and drop your company files or supply your website address. Our vector parser handles the rest.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-md border border-purple-200">
                    PDF Documents
                  </span>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-md border border-purple-200">
                    Word (.docx)
                  </span>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-md border border-purple-200">
                    Website URLs & Sitemap
                  </span>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-md border border-purple-200">
                    Notion & Zendesk Sync
                  </span>
                </div>
              </div>
              <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 rounded-xl p-8 text-center transition">
                <UploadCloud className="w-10 h-10 text-purple-500 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-bold text-slate-800">Drop your company PDF or DOCX here</p>
                <p className="text-[11px] text-slate-500 mt-1">Or enter website: https://example.com/docs</p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-purple-200 text-xs font-medium text-purple-700">
                  <span>Knowledge Base Indexing: Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 Preview Content */}
          {activeStep === 3 && (
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h5 className="text-lg font-bold text-slate-900">Customize Colors, Tone & Avatar</h5>
                <p className="text-sm text-slate-600 mt-2">
                  Pick your brand accent colors, greeting message, bot name, and conversational behavior (Strict, Friendly, Professional).
                </p>
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-600" /> Primary Color: #7c3aed (Deep Purple)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-indigo-600" /> Accent Gradient: Indigo
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">Persona:</span> Empathetic Support Specialist
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex items-center justify-center">
                <div className="w-64 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">🤖</div>
                    <span className="text-xs font-bold">BotFlow Support</span>
                  </div>
                  <div className="p-3 text-xs text-slate-600 space-y-2">
                    <div className="bg-purple-50 p-2 rounded-lg text-purple-900">
                      Hi there! Looking for pricing or admissions info?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 Preview Content */}
          {activeStep === 4 && (
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h5 className="text-lg font-bold text-slate-900">Copy One Line of Embed Code</h5>
                <p className="text-sm text-slate-600 mt-2">
                  Add this tiny snippet right before your HTML <code className="bg-slate-100 text-purple-700 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag. It loads asynchronously without slowing down page load.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-purple-700 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Script Tag'}
                  </button>
                  <button
                    onClick={onOpenEmbed}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition"
                  >
                    Framework Guides
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto shadow-inner relative">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>HTML Embed Snippet</span>
                  <span className="text-emerald-400">Async • 8KB</span>
                </div>
                <pre className="text-emerald-300">
{`<!-- BotFlow AI Chatbot Widget -->
<script
  src="https://cdn.botflow.ai/v1/widget.js"
  data-bot-id="bf_live_948a2"
  async>
</script>`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
