import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Menu, 
  X, 
  ArrowRight, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  ShieldCheck,
  Building,
  Layers,
  CreditCard,
  Bell,
  BarChart3,
  Inbox,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ 
  onOpenAuth, 
  onOpenEmbed, 
  onOpenSettings, 
  onOpenBilling,
  onOpenAnalytics,
  onOpenInbox,
  onOpenKnowledgeGaps,
  onOpenNotifications,
  unreadNotificationsCount = 0
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'Pricing', href: '#pricing' },
  ];

  const userInitial = user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100/60 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform duration-200">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">
                BotFlow<span className="text-purple-600">.ai</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-purple-600/80 -mt-1">
                AI Agent Platform
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/70 backdrop-blur-sm px-4 py-1.5 rounded-full border border-purple-100 shadow-sm">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-purple-700 px-3.5 py-1.5 rounded-full hover:bg-purple-50/80 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action / Auth Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {isAuthenticated ? (
              <>
                {/* Quick Nav Shortcuts */}
                <button
                  onClick={onOpenAnalytics}
                  title="Analytics & BI Dashboard"
                  className="p-2 rounded-xl bg-white border border-purple-100 shadow-xs hover:border-purple-300 text-slate-600 hover:text-purple-700 hover:bg-purple-50/50 transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <span className="hidden xl:inline">Analytics</span>
                </button>

                <button
                  onClick={() => onOpenInbox && onOpenInbox()}
                  title="Conversation Inbox"
                  className="p-2 rounded-xl bg-white border border-purple-100 shadow-xs hover:border-purple-300 text-slate-600 hover:text-purple-700 hover:bg-purple-50/50 transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Inbox className="w-4 h-4 text-indigo-600" />
                  <span className="hidden xl:inline">Inbox</span>
                </button>

                {/* Notification Bell with Badge */}
                <button
                  onClick={onOpenNotifications}
                  title="Notification Center"
                  className="relative p-2 rounded-xl bg-white border border-purple-100 shadow-xs hover:border-purple-300 text-slate-600 hover:text-purple-600 hover:bg-purple-50/50 transition"
                >
                  <Bell className="w-4 h-4 text-slate-600" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white animate-pulse">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-purple-100 shadow-sm hover:border-purple-300 transition"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                      {userInitial}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                        {user.full_name || user.email.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-purple-600 font-semibold leading-tight capitalize">
                        {user.business_name ? `${user.business_name}` : `${user.plan_tier || 'Free'} Plan`}
                      </div>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-purple-100 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {user.full_name || 'BotFlow User'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                          <Sparkles className="w-3 h-3" />
                          <span className="capitalize">{user.plan_tier || 'Free'} Plan</span>
                        </div>
                      </div>

                      <div className="py-1">
                        <a
                          href="#dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition"
                        >
                          <Layers className="w-4 h-4 text-purple-600" />
                          <span>My Chatbots & Dashboard</span>
                        </a>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onOpenAnalytics) onOpenAnalytics();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition text-left"
                        >
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          <span>Analytics Dashboard</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onOpenInbox) onOpenInbox();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition text-left"
                        >
                          <Inbox className="w-4 h-4 text-indigo-600" />
                          <span>Conversation Inbox</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onOpenKnowledgeGaps) onOpenKnowledgeGaps();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition text-left"
                        >
                          <HelpCircle className="w-4 h-4 text-amber-600" />
                          <span>Knowledge Gap Analysis</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onOpenNotifications) onOpenNotifications();
                          }}
                          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <Bell className="w-4 h-4 text-rose-500" />
                            <span>Notifications</span>
                          </div>
                          {unreadNotificationsCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                              {unreadNotificationsCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onOpenBilling) onOpenBilling();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition text-left"
                        >
                          <CreditCard className="w-4 h-4 text-purple-600" />
                          <span>Subscription & Billing</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onOpenSettings) onOpenSettings();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition text-left"
                        >
                          <Settings className="w-4 h-4 text-purple-600" />
                          <span>Account Settings</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-sm font-semibold text-slate-700 hover:text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-50/60 transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 rounded-xl shadow-md shadow-purple-600/25 hover:shadow-lg hover:shadow-purple-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {!isAuthenticated ? (
              <button
                onClick={() => onOpenAuth('signup')}
                className="text-xs font-semibold px-3 py-1.5 bg-purple-600 text-white rounded-lg"
              >
                Get Started
              </button>
            ) : (
              <button
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                }}
                className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs"
              >
                {userInitial}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-purple-100 shadow-xl px-5 pt-4 pb-6 mt-3 transition-all animate-fade-in">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-700 hover:text-purple-600 py-2 px-3 rounded-lg hover:bg-purple-50/70 transition"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-slate-900">{user.full_name || user.email}</p>
                    <p className="text-[11px] text-purple-700">{user.business_name || 'My Organization'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAnalytics) onOpenAnalytics();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span>Analytics Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenInbox) onOpenInbox();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <Inbox className="w-4 h-4 text-indigo-600" />
                    <span>Conversation Inbox</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenKnowledgeGaps) onOpenKnowledgeGaps();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Knowledge Gaps</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenNotifications) onOpenNotifications();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2 relative"
                  >
                    <Bell className="w-4 h-4 text-rose-500" />
                    <span>Notifications</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenBilling) onOpenBilling();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span>Subscription & Billing</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenSettings) onOpenSettings();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-purple-600" />
                    <span>Account Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-red-600 bg-red-50 rounded-xl transition"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('login');
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('signup');
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-md transition"
                  >
                    Get Started Free
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
