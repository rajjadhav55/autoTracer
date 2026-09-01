import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  RefreshCw,
  Search,
  Zap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Key,
  Copy,
  Check,
  LogOut,
  LogIn,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import MetricsHeader from './components/MetricsHeader';
import IncidentTable from './components/IncidentTable';
import IncidentDetail from './components/IncidentDetail';
import LandingPage from './components/landing/LandingPage';
import {
  fetchIncidents,
  fetchUserProfile,
  triggerChaosScenario,
  loginUser,
  registerUser,
  logoutUser,
  regenerateApiKey,
  getPersistentApiKey,
  setPersistentApiKey,
  formatErrorMessage,
} from './services/api';

export default function App() {
  // Navigation View: 'landing' | 'dashboard'
  const [currentView, setCurrentView] = useState(() => {
    return window.location.hash === '#dashboard' || window.location.hash === '#console' 
      ? 'dashboard' 
      : 'landing';
  });

  const [incidents, setIncidents] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    analyzing: 0,
    triaged: 0,
    failed: 0,
  });
  const [userProfile, setUserProfile] = useState(null);
  const [persistentApiKey, setPersistentApiKeyState] = useState(() => getPersistentApiKey());
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

  // API Key Rotation Confirmation Modal state
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [rotateConfirmText, setRotateConfirmText] = useState('');
  const [rotateLoading, setRotateLoading] = useState(false);

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

  // Sync hash with view
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#dashboard' || window.location.hash === '#console') {
        setCurrentView('dashboard');
      } else if (window.location.hash === '#landing' || window.location.hash === '') {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToView = (view) => {
    setCurrentView(view);
    window.location.hash = view === 'dashboard' ? '#dashboard' : '#landing';
    if (view === 'landing') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
      console.warn('Backend unavailable, displaying demo telemetry stream:', err?.message);
      // Fallback demo telemetry data for instant preview
      setCounts((prev) => {
        if (prev.total > 0) return prev;
        return { total: 3, pending: 0, analyzing: 0, triaged: 2, failed: 0, resolved: 1 };
      });
      setIncidents((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            id: 'inc-9021-demo',
            error_type: 'ZeroDivisionError',
            error_message: 'float division by zero',
            application_name: 'production/web',
            endpoint: '/api/v1/checkout/pricing.py',
            created_at: new Date().toISOString(),
            status: 'TRIAGED',
            runtime: 'Python 3.11 · FastAPI',
            traceback: 'Traceback (most recent call last):\n  File "services/checkout/pricing.py", line 84, in calculate_basket_discount\n    discount_rate = total_discount / customer_basket_total\nZeroDivisionError: float division by zero',
            root_cause: 'Division by zero when basket total is exactly 0.00 during discount calculation.',
            suggested_fix: 'if customer_basket_total == 0:\n    return Decimal("0.00")\nreturn total_discount / customer_basket_total'
          },
          {
            id: 'inc-9020-demo',
            error_type: 'OperationalError',
            error_message: 'connection pool exhausted (max 50)',
            application_name: 'production/api',
            endpoint: '/api/v1/webhooks/stripe-listener',
            created_at: new Date(Date.now() - 240000).toISOString(),
            status: 'RESOLVED',
            runtime: 'Python 3.11 · Django',
            traceback: 'django.db.utils.OperationalError: FATAL: remaining connection slots are reserved for non-replication superuser connections',
            root_cause: 'Unclosed transaction session inside background webhook worker.',
            suggested_fix: 'async with db.transaction():\n    await process_webhook()'
          },
          {
            id: 'inc-9019-demo',
            error_type: 'JWTDecodeError',
            error_message: 'Signature has expired',
            application_name: 'production/auth',
            endpoint: '/api/v1/auth/refresh-token',
            created_at: new Date(Date.now() - 720000).toISOString(),
            status: 'TRIAGED',
            runtime: 'Python 3.11 · FastAPI',
            traceback: 'jwt.exceptions.ExpiredSignatureError: Signature has expired',
            root_cause: 'Client refreshed auth token with clock skew of +30s.',
            suggested_fix: 'jwt.decode(token, leeway=60, algorithms=["RS256"])'
          }
        ];
      });
      setError(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadData(false);
  }, [loadProfile, loadData]);

  // Polling stream every 5s if on dashboard
  useEffect(() => {
    if (!autoRefresh || currentView !== 'dashboard') return;
    const timer = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, currentView, loadData]);

  // Global keyboard shortcuts (slash to focus search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        currentView === 'dashboard' &&
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
  }, [currentView]);

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

  const openRotateModal = () => {
    setRotateConfirmText('');
    setShowRotateModal(true);
  };

  const handleConfirmRotateKey = async () => {
    if (rotateConfirmText.trim() !== 'CONFIRM') return;
    setRotateLoading(true);
    try {
      if (userProfile) {
        const res = await regenerateApiKey();
        setUserProfile((prev) => ({ ...prev, api_key: res.api_key }));
        setPersistentApiKeyState(res.api_key);
        setPersistentApiKey(res.api_key);
        showToast('API key successfully rotated');
      } else {
        // Deterministic high-entropy guest key rotation
        const randomBytes = new Uint8Array(20);
        crypto.getRandomValues(randomBytes);
        const randomHex = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        const newGuestKey = `autotrace_pk_${randomHex}`;
        setPersistentApiKey(newGuestKey);
        setPersistentApiKeyState(newGuestKey);
        showToast('API key successfully rotated');
      }
      setShowRotateModal(false);
      setRotateConfirmText('');
    } catch (err) {
      console.error('Failed to rotate API key:', err);
      showToast(formatErrorMessage(err));
    } finally {
      setRotateLoading(false);
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
        if (res.user?.api_key) {
          setPersistentApiKeyState(res.user.api_key);
        }
        showToast(`Account created: Welcome ${res.user.username}`);
      } else {
        await loginUser(authForm);
        await loadProfile();
        showToast('Logged in successfully');
      }
      setShowAuthModal(false);
      await loadData(false);
      navigateToView('dashboard');
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
    navigateToView('landing');
    loadData(false);
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setAuthError(null);
    setShowAuthModal(true);
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

  const currentApiKey = userProfile?.api_key || persistentApiKey || getPersistentApiKey();

  return (
    <div className={`min-h-screen ${currentView === 'landing' ? 'bg-black' : 'bg-zinc-950'} text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200`}>
      
      {/* Toast Alert Notice (Global across both views) */}
      {toastMessage && (
        <div
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 border border-emerald-500/40 bg-zinc-900 px-4 py-2.5 font-mono text-xs text-zinc-100 shadow-2xl rounded-lg"
        >
          <CheckCircle2 size={15} aria-hidden="true" className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: Modern SaaS Landing Page */}
      {currentView === 'landing' ? (
        <LandingPage
          onOpenConsole={() => navigateToView('dashboard')}
          onOpenAuth={openAuthModal}
          userProfile={userProfile}
          onLogout={handleLogout}
        />
      ) : (
        /* VIEW 2: Interactive Incident Dashboard & Live Console */
        <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased relative overflow-x-hidden">
          
          {/* Ambient Background Glow Accents matching Landing Page */}
          <div className="pointer-events-none absolute -top-40 right-1/4 w-[600px] h-[350px] bg-emerald-500/10 blur-[150px] -z-10" />
          <div className="pointer-events-none absolute top-1/2 left-1/4 w-[500px] h-[300px] bg-emerald-500/5 blur-[140px] -z-10" />

          {/* Top Glass Application Bar */}
          <header className="sticky top-0 z-30 border-b border-zinc-850/80 bg-zinc-950/85 backdrop-blur-xl shadow-2xl shadow-black/60">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6 sm:py-3.5 gap-2">
              
              {/* Brand and Landing Page Switcher */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => navigateToView('landing')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-700/80 hover:border-zinc-500 text-zinc-300 hover:text-white font-mono text-xs transition-all duration-200 shadow-inner backdrop-blur-md cursor-pointer shrink-0"
                  title="Return to AutoTrace Landing Page"
                >
                  <ArrowLeft size={13} />
                  <span className="hidden sm:inline">Landing Page</span>
                </button>

                <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700/80">
                    <div className="w-3.5 h-3.5 rounded-full border border-emerald-400/80 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="font-sans text-sm sm:text-base font-bold tracking-tight text-white truncate">
                      AutoTrace
                    </span>
                    <span className="text-zinc-600 font-mono text-xs hidden md:inline">/</span>
                    <span className="font-mono text-xs text-zinc-400 hidden md:inline truncate">telemetry-console</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Live stream status indicator */}
                <button
                  type="button"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  aria-label={autoRefresh ? 'Pause live stream polling' : 'Resume live stream polling'}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs transition-all duration-200 focus-visible:ring-1 focus-visible:ring-emerald-400 cursor-pointer ${
                    autoRefresh
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                    }`}
                  />
                  <span className="tabular-nums hidden xs:inline sm:inline">
                    {autoRefresh ? 'STREAMING (60 FPS)' : 'PAUSED'}
                  </span>
                </button>

                {/* Manual refresh */}
                <button
                  type="button"
                  onClick={() => loadData(false)}
                  disabled={isRefreshing}
                  aria-label="Refresh incident list"
                  className="flex items-center gap-1.5 rounded-full border border-zinc-750 bg-zinc-900/80 px-3 py-1.5 font-mono text-xs text-zinc-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    size={12}
                    aria-hidden="true"
                    className={isRefreshing ? 'animate-spin text-emerald-400' : ''}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* Simulate crash */}
                <button
                  type="button"
                  onClick={() => handleSimulateChaos('zero_division')}
                  disabled={chaosLoading}
                  aria-label="Simulate a production exception"
                  className="flex items-center gap-1.5 rounded-full font-semibold text-xs bg-emerald-400 hover:bg-emerald-300 text-zinc-950 px-4 py-1.5 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/40 hover:scale-105 cursor-pointer disabled:opacity-50"
                >
                  <Zap size={13} aria-hidden="true" />
                  <span>{chaosLoading ? 'Triggering…' : 'Simulate Error'}</span>
                </button>

                {/* User Account / Auth Button */}
                {userProfile ? (
                  <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                    <span className="font-mono text-xs text-zinc-200 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full truncate max-w-[120px] hidden xs:inline sm:inline">
                      {userProfile.username}
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title="Log out"
                      className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <LogOut size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 font-mono text-xs text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                  >
                    <LogIn size={12} />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Main Workspace */}
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-7">
            {/* Error notification */}
            {error && (
              <div
                aria-live="polite"
                className="flex items-center justify-between border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-300 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>
                    Backend API offline / demo mode ({error}) — connect Django server on port 8000 for live data ingestion.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => loadData(false)}
                  className="font-semibold underline hover:text-white cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Section 0: SDK Ingestion & API Key Bento Terminal Box */}
            <section aria-label="SDK Quickstart & Tracking Key" className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 font-mono text-xs shadow-2xl glow-box-neon">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Key size={14} className="text-emerald-400" />
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-300">
                      AutoTrace Ingestion API Key
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-200 select-all font-mono">
                      {showKey ? currentApiKey : `${currentApiKey.slice(0, 18)}••••••••••••••••`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-zinc-800 transition cursor-pointer"
                      title={showKey ? 'Hide key' : 'Reveal key'}
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyApiKey(currentApiKey)}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 transition cursor-pointer"
                    >
                      {copiedKey ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={openRotateModal}
                      className="text-zinc-500 hover:text-emerald-400 underline text-[11px] ml-1 transition cursor-pointer"
                      title="Rotate API tracking key"
                    >
                      Rotate
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-[11px] text-zinc-400 max-w-lg overflow-x-auto shadow-inner">
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-zinc-850 text-[10px] text-zinc-500">
                    <span className="w-2 h-2 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2 h-2 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500/80 inline-block" />
                    <span>quickstart.py</span>
                  </div>
                  <span className="text-emerald-400 font-bold">import</span> autotrace
                  <br />
                  autotrace.init(api_key=<span className="text-emerald-300">"{currentApiKey.slice(0, 22)}…"</span>)
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
              {/* Status Filters - Rounded Pills */}
              <div
                role="tablist"
                aria-label="Filter incidents by status"
                className="flex flex-wrap items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 p-1.5 rounded-full backdrop-blur-xl"
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
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-mono transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40 font-semibold shadow-sm shadow-emerald-500/10'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] tabular-nums ${isSelected ? 'text-emerald-300' : 'text-zinc-500'}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search
                  size={14}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  name="incident_search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Search by service, type, path… (Press /)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl py-2 pl-9 pr-8 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 rounded-full focus:outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400/50 shadow-inner"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 border border-zinc-700/80 rounded px-1">
                  /
                </span>
              </div>
            </section>

            {/* Section 3: Semantic Table */}
            <main aria-label="Incident Stream">
              {loading && incidents.length === 0 ? (
                <div
                  aria-live="polite"
                  className="flex h-48 flex-col items-center justify-center border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl font-mono text-xs text-zinc-400 rounded-2xl glow-box-neon gap-2"
                >
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Loading live telemetry stream…</span>
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

            {/* Compact Developer Console Footer */}
            <footer className="border-t border-zinc-850 pt-5 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                <span>AutoTrace AI Triage Engine • Production Telemetry Stream</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateToView('landing')}
                  className="hover:text-emerald-400 transition-colors underline cursor-pointer"
                >
                  Back to Landing Page
                </button>
                <span>•</span>
                <span>Python &amp; React SDK Active</span>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Auth Modal (Login / Register) shared across views */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm border border-zinc-800 bg-zinc-950/95 p-6 rounded-2xl shadow-2xl font-mono text-xs glow-box-neon">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5 mb-5">
              <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>{authMode === 'login' ? 'Sign In to AutoTrace' : 'Create AutoTrace Account'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-850 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] rounded-xl font-mono">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium">Username</label>
                <input
                  type="text"
                  required
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-zinc-400 mb-1.5 font-medium">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-4 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold py-3 rounded-full transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/40 hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
              >
                {authLoading
                  ? 'Processing…'
                  : authMode === 'login'
                  ? 'Sign In'
                  : 'Register & Generate API Key'}
              </button>
            </form>

            <div className="mt-5 pt-3.5 border-t border-zinc-800 text-center text-zinc-400 text-[11px]">
              {authMode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError(null);
                    }}
                    className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    Register free
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
                    className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* API Key Rotation Confirmation Modal (Requires typing CONFIRM) */}
      {showRotateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md border border-rose-500/30 bg-zinc-950/95 p-6 rounded-2xl shadow-2xl font-mono text-xs glow-box-neon relative overflow-hidden">
            
            {/* Ambient Danger Glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 w-40 h-40 bg-rose-500/10 blur-[60px] rounded-full" />

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5 mb-4">
              <div className="flex items-center gap-2.5 text-zinc-100 font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <AlertTriangle size={16} />
                </div>
                <span className="text-white font-sans font-bold">Rotate Ingestion API Key</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRotateModal(false);
                  setRotateConfirmText('');
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-850 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-200 text-xs leading-relaxed space-y-2">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <span>⚠️ Warning: This action cannot be undone.</span>
                </p>
                <p className="text-[11px] text-zinc-300">
                  Rotating your API key will immediately invalidate the current key. Any active SDKs, backend services, or CI pipelines using this key will fail to ingest telemetry until updated with the new key.
                </p>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 text-[11px]">Current API Key</label>
                <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-zinc-300 font-mono text-xs select-all">
                  {currentApiKey.slice(0, 20)}••••••••••••••••
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1.5 font-medium text-xs">
                  To confirm, please type <span className="text-rose-400 font-bold tracking-wider">CONFIRM</span> below:
                </label>
                <input
                  type="text"
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  value={rotateConfirmText}
                  onChange={(e) => setRotateConfirmText(e.target.value)}
                  placeholder="Type CONFIRM"
                  className="w-full bg-zinc-900 border border-zinc-750 focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/50 rounded-xl px-3 py-2.5 text-white font-mono text-xs placeholder:text-zinc-600 outline-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRotateModal(false);
                    setRotateConfirmText('');
                  }}
                  className="px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={rotateConfirmText.trim() !== 'CONFIRM' || rotateLoading}
                  onClick={handleConfirmRotateKey}
                  className="px-5 py-2 rounded-full bg-rose-500 hover:bg-rose-400 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-800 text-white font-bold text-xs transition-all shadow-lg shadow-rose-500/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                >
                  {rotateLoading ? 'Rotating…' : 'Rotate API Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
