import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AutoTrace Dashboard Caught UI Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-mono">
          <div className="max-w-lg w-full border border-zinc-800 bg-zinc-900/90 rounded-xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3 text-red-400 font-semibold text-sm">
              <AlertTriangle size={18} />
              <span>Application Render Error</span>
            </div>

            <p className="text-zinc-300">
              An unexpected error occurred while rendering the dashboard UI.
            </p>

            <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-red-400 overflow-x-auto">
              {this.state.error?.toString() || 'Unknown error'}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition"
              >
                <RefreshCw size={13} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-medium transition"
              >
                Reset Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
