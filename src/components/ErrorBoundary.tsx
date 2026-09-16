import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in TON Miner Mini App:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearStorageAndReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070e18] flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            The TON Miner encountered an unexpected state. You can reload the app or clear temporary cached data.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0098ea] hover:bg-[#0088cc] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#0098ea]/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Miner
            </button>
            <button
              onClick={this.handleClearStorageAndReset}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              Reset Cache
            </button>
          </div>
          {this.state.error && (
            <div className="mt-6 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-500 max-w-md overflow-x-auto text-left">
              {this.state.error.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
