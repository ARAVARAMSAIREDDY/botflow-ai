import React, { useState } from 'react';
import { Bot, Sparkles, Send, Twitter, Github, Linkedin, Disc as Discord, ArrowUp, Check } from 'lucide-react';

export default function Footer({ onOpenAuth, onOpenEmbed, onOpenLegal }) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    setTimeout(() => {
      setNewsletterEmail('');
      setSubscribed(false);
    }, 3000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info (col-span-2) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                BotFlow<span className="text-purple-400">.ai</span>
              </span>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              Empowering businesses, hospitals, colleges, and restaurants to build custom, grounded AI chatbots in minutes. Turn your documents into 24/7 intelligent customer support.
            </p>

            {/* Newsletter Subscription */}
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Stay Updated with BotFlow Releases
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                >
                  {subscribed ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{subscribed ? 'Subscribed' : 'Join'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Links Column 1: Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
              Product & Features
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <a href="#features" className="hover:text-purple-400 transition">
                  AI Conversations
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-purple-400 transition">
                  PDF & Doc Ingestion
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-purple-400 transition">
                  Website Knowledge Sync
                </a>
              </li>
              <li>
                <button onClick={onOpenEmbed} className="hover:text-purple-400 transition text-left">
                  1-Line Embed Script
                </button>
              </li>
              <li>
                <a href="#dashboard" className="hover:text-purple-400 transition">
                  Admin Analytics
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-purple-400 transition">
                  Plans & Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Solutions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
              Use Cases
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <a href="#features" className="hover:text-purple-400 transition">
                  Hospitals & Healthcare
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-purple-400 transition">
                  Colleges & Universities
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-purple-400 transition">
                  Restaurants & Dining
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-purple-400 transition">
                  E-commerce & Retail
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-purple-400 transition">
                  SaaS & Technology
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Company & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
              Company & Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <a href="#hero" className="hover:text-purple-400 transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="mailto:support@botflow.ai" className="hover:text-purple-400 transition">
                  Contact Support
                </a>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal && onOpenLegal('privacy')} 
                  className="hover:text-purple-400 transition text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal && onOpenLegal('terms')} 
                  className="hover:text-purple-400 transition text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal && onOpenLegal('refunds')} 
                  className="hover:text-purple-400 transition text-left"
                >
                  Cancellation & Refunds
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal && onOpenLegal('security')} 
                  className="hover:text-purple-400 transition text-left"
                >
                  Security & HIPAA
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Socials, Status */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>&copy; {new Date().getFullYear()} BotFlow AI, Inc. All rights reserved.</span>
            <span>&bull;</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Social Icons & Back to Top */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-slate-400">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-purple-400 transition p-1"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-purple-400 transition p-1"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-purple-400 transition p-1"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-purple-400 transition p-1"
                aria-label="Discord"
              >
                <Discord className="w-4 h-4" />
              </a>
            </div>

            <button
              onClick={scrollToTop}
              title="Back to top"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
