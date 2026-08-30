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
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm"
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
        <header className="border-b border-zinc-800/80 px-4 py-4 sm:px-6 sm:py-5 bg-zinc-950/90">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-[11px] text-zinc-500">
                incident-inspector #{incident?.id ? incident.id.slice(0, 8) : 'loading'}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close details panel"
              className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-850 hover:text-zinc-100 focus-visible:ring-1 focus-visible:ring-zinc-400 cursor-pointer"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <StatusBadge status={incident?.status} />
              {incident?.runtime && (
                <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                  {incident.runtime}
                </span>
              )}
            </div>
            <h2
              id="incident-detail-heading"
              className="truncate font-mono text-base sm:text-lg font-bold text-red-400"
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 bg-zinc-900/50 px-4 py-2.5 sm:px-6 text-xs font-mono">
            <span className="text-zinc-400 text-[11px]">Lifecycle Transition:</span>
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
                  className={`px-3 py-1 rounded-full text-[11px] font-mono border transition cursor-pointer ${
                    incident.status === st.id
                      ? 'bg-zinc-800 text-emerald-300 border-emerald-500/40 font-semibold shadow-sm shadow-emerald-500/10'
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
          className="flex overflow-x-auto border-b border-zinc-800/80 bg-zinc-900/40 px-2 sm:px-6 no-scrollbar"
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
                className={`flex shrink-0 items-center gap-2 border-b-2 py-3 px-3 sm:px-4 font-mono text-xs font-medium transition-all cursor-pointer ${
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && (
            <div className="flex h-48 flex-col items-center justify-center font-mono text-xs text-zinc-400 gap-2">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Retrieving telemetry snapshot…</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-300">
              {error}
            </div>
          )}

          {!loading && !error && incident && (
            <>
              {/* TAB 1: AI Root Cause & Fix */}
              {activeTab === 'triage' && (
                <div className="space-y-6">
                  
                  {/* Root Cause Card with Neon Glow Border */}
                  <section aria-labelledby="root-cause-heading" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3
                        id="root-cause-heading"
                        className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-emerald-400 uppercase"
                      >
                        <Sparkles size={13} className="text-emerald-400" aria-hidden="true" />
                        <span>AI Root Cause Diagnosis</span>
                      </h3>
                      {incident.root_cause && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(incident.root_cause, 'root_cause')}
                          className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          {copiedKey === 'root_cause' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedKey === 'root_cause' ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/80 p-4 font-sans text-xs text-zinc-200 leading-relaxed shadow-lg shadow-emerald-500/5 glow-box-neon">
                      {incident.root_cause || (
                        <span className="text-zinc-500 italic font-mono">
                          AI agent analysis in progress or root cause not yet resolved.
                        </span>
                      )}
                    </div>
                  </section>

                  {/* Suggested Fix Card */}
                  <section aria-labelledby="fix-heading" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3
                        id="fix-heading"
                        className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-zinc-200 uppercase"
                      >
                        <GitPullRequest size={13} className="text-emerald-400" aria-hidden="true" />
                        <span>Automated Code-Level Remediation</span>
                      </h3>
                      {incident.suggested_fix && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(incident.suggested_fix, 'fix')}
                          className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          {copiedKey === 'fix' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedKey === 'fix' ? 'Copied' : 'Copy patch'}</span>
                        </button>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
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
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 font-mono text-[11px] text-zinc-400 flex items-center gap-2.5">
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
                      className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      {copiedKey === 'stack' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copiedKey === 'stack' ? 'Copied' : 'Copy trace'}</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[420px]">
                    <pre className="font-mono text-xs leading-relaxed whitespace-pre">
                      {formatStackTrace(incident.traceback)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: Telemetry & Context */}
              {activeTab === 'metadata' && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                    <div className="text-zinc-400 font-semibold uppercase text-[11px] border-b border-zinc-800 pb-2">
                      Runtime Environment
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
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
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                      <div className="text-zinc-400 font-semibold uppercase text-[11px]">
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
