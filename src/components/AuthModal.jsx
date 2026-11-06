import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Building, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'signup' }) {
  const { login, register, forgotPassword } = useAuth();
  
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset form when opened or mode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const res = await register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          businessName: businessName.trim()
        });

        if (res.emailConfirmationRequired) {
          setSuccessMessage('Registration successful! Please check your email to verify your account.');
        } else {
          setSuccessMessage('Account registered successfully! Redirecting to your dashboard...');
          setTimeout(() => {
            onClose();
            const el = document.getElementById('dashboard');
            el?.scrollIntoView({ behavior: 'smooth' });
          }, 900);
        }
      } else if (mode === 'login') {
        await login(email.trim(), password);
        setSuccessMessage('Login successful! Welcome back.');
        setTimeout(() => {
          onClose();
          const el = document.getElementById('dashboard');
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 800);
      } else if (mode === 'forgot') {
        await forgotPassword(email.trim());
        setSuccessMessage('Password reset link sent! Check your email inbox for instructions.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-purple-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-6 text-white text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            <span>BotFlow AI Multi-Tenant Auth</span>
          </div>
          <h3 className="text-xl font-extrabold">
            {mode === 'signup' && 'Create Your Free Account'}
            {mode === 'login' && 'Sign In to Your Workspace'}
            {mode === 'forgot' && 'Reset Your Password'}
          </h3>
          <p className="text-xs text-purple-200 mt-1 max-w-xs mx-auto">
            {mode === 'signup' && 'Strict tenant isolation, private knowledge base and encrypted vector embeddings.'}
            {mode === 'login' && 'Access your custom AI chatbots, uploaded documents, and live analytics.'}
            {mode === 'forgot' && 'Enter your verified account email to receive a secure recovery link.'}
          </p>
        </div>

        {/* Tab switcher (only for login & signup) */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccessMessage(''); }}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition ${
                mode === 'signup'
                  ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up Free
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition ${
                mode === 'login'
                  ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Log In
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Sarah Connor"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Organization
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. MetroCare Clinic or Horizon Tech"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setSuccessMessage(''); }}
                      className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-purple-600/30 hover:shadow-lg hover:shadow-purple-600/40 transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'signup' && 'Create Free Workspace'}
                    {mode === 'login' && 'Sign In to Dashboard'}
                    {mode === 'forgot' && 'Send Reset Email'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode === 'forgot' ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                className="text-xs text-purple-700 hover:text-purple-900 font-semibold"
              >
                &larr; Back to Log In
              </button>
            </div>
          ) : (
            <div className="mt-5 text-center border-t border-slate-100 pt-3">
              <p className="text-[11px] text-slate-500">
                Secured by Supabase Authentication & PostgreSQL Row Level Security (RLS).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
