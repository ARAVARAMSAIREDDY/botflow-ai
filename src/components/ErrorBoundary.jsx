import React from 'react';
import { AlertTriangle, RotateCcw, Home, Sparkles } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production, dispatch to monitoring service (e.g. Sentry, Datadog)
    if (typeof window !== 'undefined' && window.reportError) {
      window.reportError(error, errorInfo);
    }
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white font-sans">
          <div className="max-w-md w-full bg-slate-900/90 border border-purple-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                An unexpected interface error occurred. Our automated monitoring system has logged this incident for review.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 bg-black/40 border border-rose-500/30 rounded-xl text-left overflow-x-auto text-xs font-mono text-rose-300 max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-purple-600/30"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                <Home className="w-4 h-4" />
                <span>Go to Home</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 pt-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>BotFlow AI Resilient Client Architecture</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
