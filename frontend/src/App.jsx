import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  RefreshCw,
  Search,
  Zap,
  CheckCircle2,
  AlertCircle,
  Key,
  Copy,
  Check,
  User,
  LogOut,
  LogIn,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import MetricsHeader from './components/MetricsHeader';
import IncidentTable from './components/IncidentTable';
import IncidentDetail from './components/IncidentDetail';
import {
  fetchIncidents,
  fetchUserProfile,
  triggerChaosScenario,
  loginUser,
  registerUser,
  logoutUser,
  regenerateApiKey,
  formatErrorMessage,
} from './services/api';


export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    analyzing: 0,
    triaged: 0,
    failed: 0,
  });
  const [userProfile, setUserProfile] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [chaosLoading, setChaosLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const searchInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load User Profile (if JWT is present)
  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('autotrace_token');
    if (!token) {
      setUserProfile(null);
      return;
    }
    try {
      const data = await fetchUserProfile();
      setUserProfile(data);
    } catch {
      // Token might be expired or invalid
      setUserProfile(null);
    }
  }, []);

  // Load Incidents & Counts
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await fetchIncidents();
      setCounts(data.counts || {});
      setIncidents(data.results || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load incident stream:', err);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadData(false);
  }, [loadProfile, loadData]);

  // Polling stream every 5s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadData]);

  // Global keyboard shortcuts (slash to focus search)
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
      showToast('Simulated incident dispatched');
      await loadData(false);
      setTimeout(() => loadData(true), 2000);
    } catch (err) {
      showToast(formatErrorMessage(err));
      setTimeout(() => loadData(false), 1200);
    } finally {
      setChaosLoading(false);
    }
  };

  const copyApiKey = (key) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    showToast('API Key copied to clipboard');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRotateKey = async () => {
    try {
      const res = await regenerateApiKey();
      setUserProfile((prev) => ({ ...prev, api_key: res.api_key }));
      showToast('API key successfully regenerated');
    } catch (err) {
      console.error('Failed to rotate API key:', err);
      showToast(formatErrorMessage(err));
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const res = await registerUser(authForm);
        setUserProfile(res.user);
        showToast(`Account created: Welcome ${res.user.username}`);
      } else {
        await loginUser(authForm);
        await loadProfile();
        showToast('Logged in successfully');
      }
      setShowAuthModal(false);
      await loadData(false);
    } catch (err) {
      setAuthError(formatErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };


  const handleLogout = () => {
    logoutUser();
    setUserProfile(null);
    showToast('Logged out');
    loadData(false);
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && !['PENDING', 'UNRESOLVED'].includes(incident.status)) return false;
        if (statusFilter === 'ANALYZING' && !['ANALYZING', 'INVESTIGATING'].includes(incident.status)) return false;
        if (statusFilter === 'TRIAGED' && incident.status !== 'TRIAGED') return false;
        if (statusFilter === 'RESOLVED' && incident.status !== 'RESOLVED') return false;
        if (statusFilter === 'FAILED' && !['FAILED', 'IGNORED'].includes(incident.status)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const type = (incident.error_type || '').toLowerCase();
        const msg = (incident.error_message || '').toLowerCase();
        const path = (incident.endpoint || '').toLowerCase();
        const app = (incident.application_name || incident.project_name || '').toLowerCase();
        return type.includes(q) || msg.includes(q) || path.includes(q) || app.includes(q);
      }
      return true;
    });
  }, [incidents, statusFilter, searchQuery]);

  const currentApiKey = userProfile?.api_key || 'autotrace_pk_af7ebbe94406c442e299fdf21f9a052a3bc3ad28';

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
              <span className="text-zinc-500 font-mono text-xs">/</span>
              <span className="font-mono text-xs text-zinc-400">telemetry-dashboard</span>
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
              <span>{chaosLoading ? 'Triggering…' : 'Simulate Error'}</span>
            </button>

            {/* User Account / Auth Button */}
            {userProfile ? (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <span className="font-mono text-xs text-zinc-300 truncate max-w-[120px]">
                  {userProfile.username}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 rounded border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 font-mono text-xs text-indigo-300 hover:bg-indigo-500/20 transition"
              >
                <LogIn size={12} />
                <span>Sign In</span>
              </button>
            )}
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

        {/* Section 0: SDK Ingestion & API Key Card */}
        <section aria-label="SDK Quickstart & Tracking Key" className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 font-mono text-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-400">
                <Key size={13} className="text-indigo-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">AutoTrace Tracking API Key</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded text-zinc-200 select-all">
                  {showKey ? currentApiKey : `${currentApiKey.slice(0, 18)}••••••••••••••••`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-zinc-400 hover:text-zinc-200 p-1"
                  title={showKey ? 'Hide key' : 'Reveal key'}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => copyApiKey(currentApiKey)}
                  className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 px-2.5 py-1 rounded border border-zinc-700 transition"
                >
                  {copiedKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
                {userProfile && (
                  <button
                    type="button"
                    onClick={handleRotateKey}
                    className="text-zinc-500 hover:text-zinc-400 underline text-[11px] ml-1"
                  >
                    Rotate
                  </button>
                )}
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded p-2.5 text-[11px] text-zinc-400 max-w-lg overflow-x-auto">
              <span className="text-zinc-500"># Python SDK quickstart:</span>
              <br />
              <span className="text-indigo-300">import</span> autotrace
              <br />
              autotrace.init(api_key=<span className="text-emerald-400">"{currentApiKey.slice(0, 22)}…"</span>)
            </div>
          </div>
        </section>

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
            className="flex flex-wrap items-center gap-1 border border-zinc-800 bg-zinc-900/60 p-1 rounded"
          >
            {[
              { id: 'ALL', label: 'All', count: counts.total || 0 },
              { id: 'PENDING', label: 'Pending', count: counts.pending || counts.unresolved || 0 },
              { id: 'ANALYZING', label: 'Analyzing', count: counts.analyzing || counts.investigating || 0 },
              { id: 'TRIAGED', label: 'Triaged', count: counts.triaged || 0 },
              { id: 'RESOLVED', label: 'Resolved', count: counts.resolved || 0 },
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
          <div className="relative w-full sm:w-80">
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
              placeholder="Search by app, type, route… (Press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-zinc-800 bg-zinc-900/80 py-1.5 pl-8 pr-3 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 rounded focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:border-zinc-700"
            />
          </div>
        </section>

        {/* Section 3: Semantic Table */}
        <main aria-label="Incident Stream">
          {loading && incidents.length === 0 ? (
            <div
              aria-live="polite"
              className="flex h-48 flex-col items-center justify-center border border-zinc-800 bg-zinc-900/40 font-mono text-xs text-zinc-400 rounded-lg"
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
            onStatusUpdated={() => loadData(true)}
          />
        )}

        {/* Compact Developer Footer */}
        <footer className="border-t border-zinc-800/80 pt-4 pb-8 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>AutoTrace AI Engine • Telemetry Ingestion Active</span>
          </div>
          <div>
            <span>Django REST / SimpleJWT / PostgreSQL / Gemini 3.6 Flash</span>
          </div>
        </footer>
      </div>

      {/* Auth Modal (Login / Sign Up) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm border border-zinc-800 bg-zinc-900 p-6 rounded-lg shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
                <ShieldCheck size={16} className="text-indigo-400" />
                <span>{authMode === 'login' ? 'Sign In to AutoTrace' : 'Create AutoTrace Account'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] rounded">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-zinc-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded transition disabled:opacity-50"
              >
                {authLoading
                  ? 'Processing…'
                  : authMode === 'login'
                  ? 'Sign In'
                  : 'Register & Generate API Key'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-zinc-800 text-center text-zinc-400 text-[11px]">
              {authMode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError(null);
                    }}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Register
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
