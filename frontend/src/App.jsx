import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  Zap,
  Filter,
  Radio,
  ServerCrash,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import MetricsHeader from './components/MetricsHeader';
import IncidentTable from './components/IncidentTable';
import IncidentDetail from './components/IncidentDetail';
import { fetchIncidents, triggerChaosScenario } from './services/api';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    analyzing: 0,
    triaged: 0,
    failed: 0,
  });
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [chaosLoading, setChaosLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Show a temporary toast banner
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch incidents & counts from backend
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await fetchIncidents();
      setCounts(data.counts || {});
      setIncidents(data.results || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError(err.message || 'Failed to connect to AutoTrace API');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Real-time polling every 4 seconds when autoRefresh is active
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Simulate a test crash to verify ingestion & Gemini AI triage
  const handleSimulateChaos = async (scenario = 'zero_division') => {
    setChaosLoading(true);
    try {
      await triggerChaosScenario(scenario);
      showToast('⚡ Chaos test error triggered! Incident captured.');
      // Refresh immediately, then again in 2s to allow Celery worker to finish
      await loadData(false);
      setTimeout(() => loadData(true), 2500);
    } catch (err) {
      // If the chaos endpoint raised 500 as expected, the middleware captured it!
      showToast('⚡ Chaos error triggered & intercepted by AutoTrace.');
      setTimeout(() => loadData(false), 1500);
    } finally {
      setChaosLoading(false);
    }
  };

  // Filtered incidents list
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // Status filter
      if (statusFilter !== 'ALL' && incident.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const errorType = (incident.error_type || '').toLowerCase();
        const errorMessage = (incident.error_message || '').toLowerCase();
        const endpoint = (incident.endpoint || '').toLowerCase();
        return errorType.includes(q) || errorMessage.includes(q) || endpoint.includes(q);
      }
      return true;
    });
  }, [incidents, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary antialiased selection:bg-accent-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[900px] rounded-full bg-accent-600/10 blur-[130px]" />
        <div className="absolute top-1/3 -left-32 h-[350px] w-[350px] rounded-full bg-info-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation / Header Bar */}
        <header className="mb-8 flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-accent-600 to-indigo-500 shadow-lg shadow-accent-500/25 ring-1 ring-white/20">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">AutoTrace</h1>
                <span className="rounded-md border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-accent-400">
                  AI Triage Engine
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Autonomous error monitoring, stack diagnosis & fix suggestions
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Polling Status Indicator */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                autoRefresh
                  ? 'border-success-500/30 bg-success-500/10 text-success-400'
                  : 'border-border bg-surface-800 text-text-muted hover:text-text-secondary'
              }`}
              title={autoRefresh ? 'Click to pause auto-polling' : 'Click to enable live 4s polling'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  autoRefresh ? 'bg-success-400 animate-pulse-dot' : 'bg-text-muted'
                }`}
              />
              <span>{autoRefresh ? 'Live Monitoring' : 'Polling Paused'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => loadData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-800 px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:bg-surface-700 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-accent-400' : ''} />
              <span>Refresh</span>
            </button>

            {/* Test Chaos Error Trigger */}
            <button
              onClick={() => handleSimulateChaos('zero_division')}
              disabled={chaosLoading}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-accent-600/25 transition-all hover:from-accent-500 hover:to-indigo-500 hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              <Zap size={14} className={chaosLoading ? 'animate-bounce' : ''} />
              <span>{chaosLoading ? 'Triggering...' : 'Simulate Crash'}</span>
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="animate-fade-in fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-accent-500/40 bg-surface-800/95 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md">
            <CheckCircle2 size={18} className="text-success-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Backend Connection Error Banner */}
        {error && (
          <div className="mb-8 flex items-center justify-between rounded-xl border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-400">
            <div className="flex items-center gap-2.5">
              <ServerCrash size={18} />
              <span>
                <strong>Connection Error:</strong> {error}. Make sure your Django backend is running at{' '}
                <code className="font-mono text-xs text-white">http://localhost:8000</code>.
              </span>
            </div>
            <button
              onClick={() => loadData(false)}
              className="rounded-lg bg-danger-500/20 px-3 py-1 text-xs font-medium text-white hover:bg-danger-500/30"
            >
              Retry
            </button>
          </div>
        )}

        {/* Metrics Summary Header */}
        <section className="mb-8">
          <MetricsHeader counts={counts} />
        </section>

        {/* Search, Filter & View Controls */}
        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface-800/60 p-1 backdrop-blur-xs">
            {[
              { id: 'ALL', label: 'All Errors', count: counts.total || 0 },
              { id: 'PENDING', label: 'Pending', count: counts.pending || 0 },
              { id: 'ANALYZING', label: 'Analyzing', count: counts.analyzing || 0 },
              { id: 'TRIAGED', label: 'Triaged', count: counts.triaged || 0 },
              { id: 'FAILED', label: 'Failed', count: counts.failed || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-surface-700 text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    statusFilter === tab.id ? 'bg-surface-600 text-accent-400' : 'bg-surface-700/60 text-text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search errors, paths, messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-800/80 py-2 pl-9 pr-3.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>
        </section>

        {/* Main Incidents Table */}
        <main>
          {loading && incidents.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface-800/40">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              <p className="text-xs text-text-muted">Loading incident stream...</p>
            </div>
          ) : (
            <IncidentTable
              incidents={filteredIncidents}
              selectedId={selectedIncidentId}
              onSelect={(id) => setSelectedIncidentId(id)}
            />
          )}
        </main>

        {/* Slide-over Incident Details Drawer */}
        {selectedIncidentId && (
          <IncidentDetail
            incidentId={selectedIncidentId}
            onClose={() => setSelectedIncidentId(null)}
            onRefreshList={() => loadData(true)}
          />
        )}

        {/* Footer info */}
        <footer className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-text-muted sm:flex-row">
          <p>AutoTrace Triage Dashboard • Powered by Django, Celery & Google Gemini</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
              API Connected (:8000)
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
