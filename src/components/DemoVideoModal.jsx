import React, { useState } from 'react';
import { X, Play, Pause, RotateCcw, Sparkles, CheckCircle2, Bot, FileText, Code } from 'lucide-react';

export default function DemoVideoModal({ isOpen, onClose, onOpenChat }) {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  if (!isOpen) return null;

  const demoTour = [
    {
      title: 'Step 1: Upload Documents',
      subtitle: 'Knowledge Ingestion Engine',
      detail: 'BotFlow AI reads PDF, Word documents, text manuals, and crawls your public website. Each paragraph is split, embedded, and securely stored in an isolated vector index.',
      visual: '📄 Uploading Employee_Handbook_2026.pdf (142 chunks parsed in 1.4s)',
      status: 'Vectors ready'
    },
    {
      title: 'Step 2: Customization & Branding',
      subtitle: 'Color schemes & persona tone',
      detail: 'Tailor the assistant to sound like your brand. Set primary colors, greeting message, avatar, and fallback behavior when queries are out of scope.',
      visual: '🎨 Theme: Purple Glow (#7c3aed) • Persona: Friendly & Grounded',
      status: 'Branding locked'
    },
    {
      title: 'Step 3: Instant Live Deployment',
      subtitle: '1-line JavaScript Embed',
      detail: 'Copy your generated embed script tag and add it to your website header or footer. The floating widget goes live instantly for all visitors.',
      visual: '<script src="https://cdn.botflow.ai/v1/widget.js" async></script>',
      status: 'Live & Active'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative text-white">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">BotFlow AI Interactive Walkthrough</h3>
              <p className="text-xs text-slate-400">See how fast you can build and launch your chatbot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Walkthrough Screen */}
        <div className="p-6 sm:p-8">
          {/* Virtual Player Display */}
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-6 min-h-[260px] flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/80">
              <span className="font-mono text-purple-400 font-bold">
                DEMO REEL &bull; {demoTour[activeStep].title}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-500/30">
                {demoTour[activeStep].status}
              </span>
            </div>

            <div className="my-6">
              <h4 className="text-xl font-extrabold text-white">
                {demoTour[activeStep].subtitle}
              </h4>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                {demoTour[activeStep].detail}
              </p>
              <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-purple-300">
                {demoTour[activeStep].visual}
              </div>
            </div>

            {/* Step navigation dots */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                {demoTour.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`h-2 rounded-full transition-all ${
                      activeStep === i ? 'w-8 bg-purple-500' : 'w-2 bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : 2))}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                >
                  Previous
                </button>
                <button
                  onClick={() => setActiveStep((prev) => (prev < 2 ? prev + 1 : 0))}
                  className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white"
                >
                  Next Step
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Want to test this live on your screen right now?
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onOpenChat();
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:opacity-95 transition"
            >
              Open Floating Live Chat 💬
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
