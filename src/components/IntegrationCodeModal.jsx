import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Code, 
  Globe, 
  FileCode, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles,
  Bot,
  Layers,
  Palette,
  Layout,
  Terminal
} from 'lucide-react';
import { getBackendBaseUrl } from '../services/api';

export default function IntegrationCodeModal({ isOpen, onClose, chatbot, chatbots = [] }) {
  const [selectedBotId, setSelectedBotId] = useState(chatbot?.id || (chatbots[0]?.id || ''));
  const [activeTab, setActiveTab] = useState('html'); // 'html' | 'react' | 'nextjs' | 'wordpress' | 'shopify'
  const [copied, setCopied] = useState(false);
  
  // Customization overrides for snippet preview
  const [position, setPosition] = useState(chatbot?.position || 'bottom-right');
  const [primaryColor, setPrimaryColor] = useState(chatbot?.primary_color || '#7c3aed');
  const [theme, setTheme] = useState(chatbot?.theme || 'light');

  if (!isOpen) return null;

  const currentBot = chatbots.find(b => b.id === selectedBotId) || chatbot || chatbots[0] || {
    id: '00000000-0000-0000-0000-000000000001',
    public_id: 'bf_live_support101',
    name: 'Customer Support Bot',
    primary_color: '#7c3aed'
  };

  const publicId = currentBot.public_id || currentBot.id;
  const backendBase = getBackendBaseUrl();
  const scriptUrl = import.meta.env.VITE_WIDGET_URL || `${backendBase}/widget/botflow.js`;
  const apiUrl = backendBase;

  const snippets = {
    html: `<!-- ================================================================= -->
<!-- BotFlow AI Chatbot Widget (Paste before </body> in your HTML)     -->
<!-- ================================================================= -->
<script
  src="${scriptUrl}"
  data-chatbot-id="${publicId}"
  data-api-url="${apiUrl}"
  data-position="${position}"
  data-primary-color="${primaryColor}"
  data-theme="${theme}"
  async
  defer>
</script>`,

    react: `// Reusable BotFlow AI Chatbot Component for React (Vite / CRA)
import React, { useEffect } from 'react';

export default function BotFlowChatbot() {
  useEffect(() => {
    // Check if script already injected
    if (document.querySelector('script[data-chatbot-id="${publicId}"]')) return;

    const script = document.createElement('script');
    script.src = "${scriptUrl}";
    script.setAttribute('data-chatbot-id', "${publicId}");
    script.setAttribute('data-api-url', "${apiUrl}");
    script.setAttribute('data-position', "${position}");
    script.setAttribute('data-primary-color', "${primaryColor}");
    script.setAttribute('data-theme', "${theme}");
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Optional cleanup on unmount
      const existing = document.getElementById('botflow-widget-root');
      if (existing) existing.remove();
    };
  }, []);

  return null; // The widget renders via its isolated Shadow DOM
}`,

    nextjs: `// Next.js (App Router / Pages Router)
// In your layout.tsx or page.tsx:
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* BotFlow AI Standalone Widget */}
        <Script
          src="${scriptUrl}"
          strategy="afterInteractive"
          data-chatbot-id="${publicId}"
          data-api-url="${apiUrl}"
          data-position="${position}"
          data-primary-color="${primaryColor}"
          data-theme="${theme}"
        />
      </body>
    </html>
  );
}`,

    wordpress: `<!-- WordPress Installation Instructions: -->
<!-- 1. Log in to your WordPress Admin dashboard. -->
<!-- 2. Go to Plugins > Add New and install 'WPCode - Insert Headers and Footers'. -->
<!-- 3. Go to Code Snippets > Header & Footer. -->
<!-- 4. In the 'Footer' box, paste the following snippet and click 'Save Changes': -->

<script
  src="${scriptUrl}"
  data-chatbot-id="${publicId}"
  data-api-url="${apiUrl}"
  data-position="${position}"
  data-primary-color="${primaryColor}"
  async
  defer>
</script>`,

    shopify: `<!-- Shopify Installation Instructions: -->
<!-- 1. In your Shopify Admin, go to Online Store > Themes. -->
<!-- 2. Click the '...' button next to your active theme and choose 'Edit code'. -->
<!-- 3. In the left file explorer, open 'Layout / theme.liquid'. -->
<!-- 4. Scroll to the bottom and locate the closing </body> tag. -->
<!-- 5. Paste this snippet immediately above the </body> tag and click Save: -->

<script
  src="${scriptUrl}"
  data-chatbot-id="${publicId}"
  data-api-url="${apiUrl}"
  data-position="${position}"
  data-primary-color="${primaryColor}"
  data-customer-id="{{ customer.id | default: '' }}"
  async
  defer>
</script>`
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative text-white flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Embed BotFlow AI on Your Site</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Universal SDK v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Single JavaScript script tag with complete Shadow DOM CSS isolation
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

        {/* Controls Toolbar: Select Bot, Position, Color */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Bot Selector */}
          {chatbots.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Select Chatbot:</span>
              <select
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
              >
                {chatbots.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Public ID:</span>
            <code className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-[11px] text-purple-300">
              {publicId}
            </code>
          </div>

          <div className="flex items-center gap-3">
            {/* Position */}
            <div className="flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px]"
              >
                <option value="bottom-right">Bottom-Right</option>
                <option value="bottom-left">Bottom-Left</option>
              </select>
            </div>

            {/* Live Test Site Link */}
            <a
              href="http://localhost:5001/test-site/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-semibold transition"
            >
              <span>Test on Sample Site</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Platform Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800 flex gap-2 overflow-x-auto bg-slate-950/20">
          {[
            { id: 'html', label: 'HTML / Vanilla JS' },
            { id: 'react', label: 'React.js' },
            { id: 'nextjs', label: 'Next.js' },
            { id: 'wordpress', label: 'WordPress' },
            { id: 'shopify', label: 'Shopify' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-semibold px-4 py-2.5 rounded-t-xl transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400 bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Snippet Box */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto group">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-sans text-xs font-bold transition shadow-md shadow-purple-600/30"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
            <pre className="pt-8 sm:pt-0 whitespace-pre overflow-x-auto">
              <code>{snippets[activeTab]}</code>
            </pre>
          </div>

          {/* Quick Integration Guidance */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="font-bold text-white block mb-0.5">1. Zero CSS Conflicts</span>
              <span className="text-slate-400 text-[11px]">
                Enclosed inside Shadow DOM. Host website stylesheets cannot alter the widget.
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="font-bold text-white block mb-0.5">2. Async & Lightweight</span>
              <span className="text-slate-400 text-[11px]">
                Under 15KB with zero dependencies. Does not block webpage rendering or speed scores.
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="font-bold text-white block mb-0.5">3. Grounded Citations</span>
              <span className="text-slate-400 text-[11px]">
                Answers display clickable source citations to verified PDF handbooks and web pages.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Need custom domain whitelisting? Configure allowed domains in Dashboard.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
