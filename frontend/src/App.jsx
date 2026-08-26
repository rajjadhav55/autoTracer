import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  RefreshCw,
  Search,
  Zap,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Cpu,
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
  const searchInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await fetchIncidents();
      setCounts(data.counts || {});
      setIncidents(data.results || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load incident stream:', err);
      setError(err.message || 'API unreachable on port 8000');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Polling stream every 4s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadData(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadData]);

  // Global keyboard shortcuts (slash to focus search, R to reload)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSimulateChaos = async (scenario = 'zero_division') => {
    setChaosLoading(true);
    try {
      await triggerChaosScenario(scenario);
      showToast('Chaos incident intercepted by middleware');
      await loadData(false);
      setTimeout(() => loadData(true), 2500);
    } catch {
      showToast('Chaos incident intercepted by middleware');
      setTimeout(() => loadData(false), 1200);
    } finally {
      setChaosLoading(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (statusFilter !== 'ALL' && incident.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const type = (incident.error_type || '').toLowerCase();
        const msg = (incident.error_message || '').toLowerCase();
        const path = (incident.endpoint || '').toLowerCase();
        return type.includes(q) || msg.includes(q) || path.includes(q);
      }
      return true;
    });
  }, [incidents, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-zinc-700 selection:text-white">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-100 font-mono text-xs font-bold">
              AT
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold tracking-tight text-zinc-100">
                AutoTrace
              </span>
              <span className="text-zinc-400 font-mono text-xs">/</span>
              <span className="font-mono text-xs text-zinc-400">triage-console</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Live stream status indicator */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              aria-label={autoRefresh ? 'Pause live stream polling' : 'Resume live stream polling'}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-xs transition-colors duration-100 focus-visible:ring-1 focus-visible:ring-zinc-400 ${
                autoRefresh
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  autoRefresh ? 'bg-emerald-400 animate-pulse-pip' : 'bg-zinc-400'
                }`}
              />
              <span className="tabular-nums">
                {autoRefresh ? 'STREAMING' : 'PAUSED'}
              </span>
            </button>

            {/* Manual refresh */}
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isRefreshing}
              aria-label="Refresh incident list"
              className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-300 transition-colors duration-100 hover:bg-zinc-850 hover:text-zinc-100 focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                aria-hidden="true"
                className={isRefreshing ? 'animate-spin text-zinc-400' : ''}
              />
              <span>Refresh</span>
            </button>

            {/* Simulate crash */}
            <button
              type="button"
              onClick={() => handleSimulateChaos('zero_division')}
              disabled={chaosLoading}
              aria-label="Simulate a production exception"
              className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-100 px-3 py-1 font-mono text-xs font-semibold text-zinc-950 transition-colors duration-100 hover:bg-white active:bg-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-50"
            >
              <Zap size={12} aria-hidden="true" />
              <span>{chaosLoading ? 'Triggering…' : 'Trigger Chaos'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Error notification */}
        {error && (
          <div
            aria-live="polite"
            className="flex items-center justify-between border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-300"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={14} aria-hidden="true" />
              <span>
                Backend API unreachable ({error}) — verify Django is running on port 8000.
              </span>
            </div>
            <button
              type="button"
              onClick={() => loadData(false)}
              className="font-semibold underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Toast alert */}
        {toastMessage && (
          <div
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-3.5 py-2 font-mono text-xs text-zinc-100 shadow-xl"
          >
            <CheckCircle2 size={14} aria-hidden="true" className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Section 1: Precision Metrics Strip */}
        <section aria-label="Incident Summary Metrics">
          <MetricsHeader counts={counts} />
        </section>

        {/* Section 2: Toolbar (Filters & Search) */}
        <section
          aria-label="Incident Filter Toolbar"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Status Filters */}
          <div
            role="tablist"
            aria-label="Filter incidents by status"
            className="flex flex-wrap items-center gap-1 border border-zinc-800 bg-zinc-900/60 p-1"
          >
            {[
              { id: 'ALL', label: 'All', count: counts.total || 0 },
              { id: 'PENDING', label: 'Pending', count: counts.pending || 0 },
              { id: 'ANALYZING', label: 'Analyzing', count: counts.analyzing || 0 },
              { id: 'TRIAGED', label: 'Triaged', count: counts.triaged || 0 },
              { id: 'FAILED', label: 'Failed', count: counts.failed || 0 },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 font-mono text-xs transition-colors duration-100 focus-visible:ring-1 focus-visible:ring-zinc-400 ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] text-zinc-400 tabular-nums">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search
              size={13}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              name="incident_search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search errors, routes, messages… (Press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-zinc-800 bg-zinc-900/80 py-1.5 pl-8 pr-3 font-mono text-xs text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:border-zinc-700"
            />
          </div>
        </section>

        {/* Section 3: Semantic Table */}
        <main aria-label="Incident Stream">
          {loading && incidents.length === 0 ? (
            <div
              aria-live="polite"
              className="flex h-48 flex-col items-center justify-center border border-zinc-800 bg-zinc-900/40 font-mono text-xs text-zinc-400"
            >
              Loading incident stream…
            </div>
          ) : (
            <IncidentTable
              incidents={filteredIncidents}
              selectedId={selectedIncidentId}
              onSelect={(id) => setSelectedIncidentId(id)}
            />
          )}
        </main>

        {/* Slide-over Inspector Drawer */}
        {selectedIncidentId && (
          <IncidentDetail
            incidentId={selectedIncidentId}
            onClose={() => setSelectedIncidentId(null)}
          />
        )}

        {/* Compact Developer Footer */}
        <footer className="border-t border-zinc-800/80 pt-4 pb-8 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>AutoTrace AI Engine • Celery Worker Active</span>
          </div>
          <div>
            <span>Django REST / PostgreSQL / Gemini 3.6 Flash</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
