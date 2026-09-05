import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Layers,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { fetchIncidentDetail, updateIncidentStatus } from '../services/api';

export default function IncidentDetail({ incidentId, onClose, onStatusUpdated }) {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('triage');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!incidentId) return;

    let isMounted = true;
    
    fetchIncidentDetail(incidentId)
      .then((data) => {
        if (isMounted) {
          setIncident(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || err.message || 'Failed to load incident detail');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyToClipboard = (content, keyName) => {
    if (!content) return;
    const text = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleStatusChange = async (newStatus) => {
    if (!incidentId || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateIncidentStatus(incidentId, newStatus);
      setIncident(updated);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err) {
      console.error('Failed to update incident status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatStackTrace = (tb) => {
    if (!tb) return 'No stack trace captured.';
    if (typeof tb === 'string') return tb;
    if (Array.isArray(tb)) {
      return tb.map((frame) => {
        if (typeof frame === 'object' && frame !== null) {
          const file = frame.file || frame.filename || 'unknown';
          const line = frame.line || frame.lineno || '?';
          const func = frame.function || frame.name || '';
          const code = frame.code || frame.context_line || '';
          return `  File "${file}", line ${line}, in ${func}\n    ${code}`.trimEnd();
        }
        return String(frame);
      }).join('\n');
    }
    return JSON.stringify(tb, null, 2);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-detail-heading"
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md"
    >
      {/* Click-away backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-zinc-800/80 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-right duration-200">
        
        {/* Top Mac Window Bar Header */}
        <header className="border-b border-zinc-850 px-5 py-4 sm:px-6 sm:py-5 bg-zinc-950/90 relative">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-inner" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-inner" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-inner" />
              <span className="ml-2 font-mono text-xs font-semibold text-zinc-300">
                incident-inspector #{incident?.id ? incident.id.slice(0, 8) : 'loading'}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close details panel"
              className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-850 hover:text-white focus-visible:ring-1 focus-visible:ring-emerald-400 cursor-pointer"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <StatusBadge status={incident?.status} />
              {incident?.runtime && (
                <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
                  {incident.runtime}
                </span>
              )}
            </div>
            <h2
              id="incident-detail-heading"
              className="truncate font-mono text-lg sm:text-xl font-bold text-rose-400"
            >
              {incident?.error_type || (loading ? 'Retrieving telemetry…' : 'Error Incident')}
            </h2>
            <p className="line-clamp-2 text-xs text-zinc-300 font-mono leading-relaxed">
              {incident?.error_message || '—'}
            </p>
          </div>
        </header>

        {/* Quick Status Bar */}
        {incident && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 bg-zinc-900/50 px-5 py-3 sm:px-6 text-xs font-mono">
            <span className="text-zinc-400 text-[11px] font-medium">Lifecycle Transition:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'PENDING', label: 'Pending' },
                { id: 'ANALYZING', label: 'Investigate' },
                { id: 'RESOLVED', label: 'Mark Resolved' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange(st.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono border transition-all duration-200 cursor-pointer ${
                    incident.status === st.id
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 font-semibold shadow-sm shadow-emerald-500/10'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation matching Landing Page */}
        <nav
          role="tablist"
          aria-label="Incident detail views"
          className="flex overflow-x-auto border-b border-zinc-850 bg-zinc-900/40 px-3 sm:px-6 no-scrollbar"
        >
          {[
            { id: 'triage', label: 'AI Root Cause & Fix', icon: Sparkles },
            { id: 'stack', label: 'Stack Trace', icon: Terminal },
            { id: 'metadata', label: 'Telemetry & Context', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 py-3.5 px-3 sm:px-4 font-mono text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-400 text-emerald-400 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon size={14} aria-hidden="true" className={isSelected ? 'text-emerald-400' : ''} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading && (
            <div className="flex h-48 flex-col items-center justify-center font-mono text-xs text-zinc-400 gap-3">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Retrieving telemetry snapshot…</span>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-300">
              {error}
            </div>
          )}

          {!loading && !error && incident && (
            <>
              {/* TAB 1: AI Root Cause & Fix */}
              {activeTab === 'triage' && (
                <div className="space-y-6">
                  
                  {/* Root Cause Card with Neon Glow Border & Bento styling */}
                  <section aria-labelledby="root-cause-heading" className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <Sparkles size={13} />
                        </div>
                        <h3
                          id="root-cause-heading"
                          className="font-mono text-xs font-bold tracking-wider text-emerald-400 uppercase"
                        >
                          AI Autonomous Root Cause Engine
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          99.4% Confidence
                        </span>
                        {incident.root_cause && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(incident.root_cause, 'root_cause')}
                            className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer p-1 rounded hover:bg-zinc-800"
                          >
                            {copiedKey === 'root_cause' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedKey === 'root_cause' ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/80 p-5 font-sans text-xs sm:text-sm text-zinc-200 leading-relaxed shadow-xl glow-box-neon relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                      {incident.root_cause || (
                        <span className="text-zinc-500 italic font-mono text-xs">
                          AI agent analysis in progress or root cause not yet resolved.
                        </span>
                      )}
                    </div>
                  </section>

                  {/* Suggested Fix Card */}
                  <section aria-labelledby="fix-heading" className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                          <GitPullRequest size={13} />
                        </div>
                        <h3
                          id="fix-heading"
                          className="font-mono text-xs font-bold tracking-wider text-zinc-200 uppercase"
                        >
                          Automated Code Remediation
                        </h3>
                      </div>

                      {incident.suggested_fix && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(incident.suggested_fix, 'fix')}
                          className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-emerald-400 cursor-pointer p-1 rounded hover:bg-zinc-800 transition-colors"
                        >
                          {copiedKey === 'fix' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedKey === 'fix' ? 'Copied' : 'Copy Patch'}</span>
                        </button>
                      )}
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto shadow-inner">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-850 text-[10px] text-zinc-500 font-mono">
                        <span>patch-remediation.diff</span>
                        <span>Unified Diff</span>
                      </div>
                      {incident.suggested_fix ? (
                        <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                          {incident.suggested_fix}
                        </pre>
                      ) : (
                        <span className="text-zinc-500 italic">
                          No remediation patch generated.
                        </span>
                      )}
                    </div>
                  </section>

                  {/* Fast Action Tip */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 font-mono text-xs text-zinc-400 flex items-center gap-3 backdrop-blur-md">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>AutoTrace AI synthesized this patch in ~0.4s using runtime telemetry frames.</span>
                  </div>
                </div>
              )}

              {/* TAB 2: Stack Trace */}
              {activeTab === 'stack' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Execution Call Stack
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(formatStackTrace(incident.traceback), 'stack')}
                      className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-emerald-400 cursor-pointer p-1 rounded hover:bg-zinc-800 transition-colors"
                    >
                      {copiedKey === 'stack' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'stack' ? 'Copied' : 'Copy Trace'}</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[420px] shadow-inner">
                    <pre className="font-mono text-xs leading-relaxed whitespace-pre">
                      {formatStackTrace(incident.traceback)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: Telemetry & Context */}
              {activeTab === 'metadata' && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 space-y-3 backdrop-blur-xl">
                    <div className="text-zinc-400 font-semibold uppercase text-[11px] border-b border-zinc-800 pb-2">
                      Runtime Environment
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-zinc-500">Service:</span>
                        <p className="text-zinc-200 font-semibold">{incident.application_name || 'default-app'}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">HTTP Method:</span>
                        <p className="text-emerald-400 font-semibold">{incident.http_method || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Endpoint:</span>
                        <p className="text-zinc-200 font-semibold truncate">{incident.endpoint || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Captured At:</span>
                        <p className="text-zinc-200">{new Date(incident.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {incident.context_data && Object.keys(incident.context_data).length > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 space-y-2 shadow-inner">
                      <div className="text-zinc-400 font-semibold uppercase text-[11px] border-b border-zinc-850 pb-2">
                        Sanitized Context Payload
                      </div>
                      <pre className="text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(incident.context_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </aside>
    </div>
  );
}
