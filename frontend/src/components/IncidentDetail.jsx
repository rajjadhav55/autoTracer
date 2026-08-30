import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Layers,
  Sparkles,
  AlertTriangle,
  Timer,
  Code2,
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
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-[2px]"
    >
      {/* Click-away backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <header className="flex items-start justify-between border-b border-zinc-800 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 pr-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <StatusBadge status={incident?.status} />
              <span className="font-mono text-xs text-zinc-400 truncate">
                {incident?.id ? `${incident.id.slice(0, 8)}…` : ''}
              </span>
            </div>
            <h2
              id="incident-detail-heading"
              className="truncate font-mono text-sm sm:text-base font-semibold text-red-400"
            >
              {incident?.error_type || (loading ? 'Loading…' : 'Error Incident')}
            </h2>
            <p className="line-clamp-2 text-xs text-zinc-300">
              {incident?.error_message || '—'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details panel"
            className="shrink-0 rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-1 focus-visible:ring-zinc-400 cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Quick Status Bar */}
        {incident && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 bg-zinc-900/50 px-4 py-2.5 sm:px-6 text-xs font-mono">
            <span className="text-zinc-400">Set Status:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'PENDING', label: 'Pending' },
                { id: 'ANALYZING', label: 'Investigating' },
                { id: 'RESOLVED', label: 'Resolved' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange(st.id)}
                  className={`px-2 py-0.5 rounded text-[11px] border transition cursor-pointer ${
                    incident.status === st.id
                      ? 'bg-zinc-800 text-white border-zinc-700 font-semibold'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <nav
          role="tablist"
          aria-label="Incident detail views"
          className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-900/40 px-2 sm:px-6 no-scrollbar"
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
                className={`flex shrink-0 items-center gap-1.5 border-b-2 py-3 px-3 sm:px-4 font-mono text-xs font-medium transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon size={13} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && (
            <div className="flex h-48 items-center justify-center font-mono text-xs text-zinc-400">
              Retrieving telemetry snapshot…
            </div>
          )}

          {error && (
            <div className="border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-300">
              {error}
            </div>
          )}

          {!loading && !error && incident && (
            <>
              {/* TAB 1: AI Root Cause & Fix */}
              {activeTab === 'triage' && (
                <div className="space-y-6">
                  {/* Root Cause Card */}
                  <section aria-labelledby="root-cause-heading" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3
                        id="root-cause-heading"
                        className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-zinc-200 uppercase"
                      >
                        <AlertTriangle size={13} className="text-amber-400" aria-hidden="true" />
                        <span>Identified Root Cause</span>
                      </h3>
                      {incident.root_cause && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(incident.root_cause, 'root_cause')}
                          className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                        >
                          {copiedKey === 'root_cause' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedKey === 'root_cause' ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-900/60 p-4 font-sans text-xs text-zinc-200 leading-relaxed">
                      {incident.root_cause || (
                        <span className="text-zinc-500 italic">
                          AI agent analysis in progress or root cause not yet resolved.
                        </span>
                      )}
                    </div>
                  </section>

                  {/* Suggested Fix Card */}
                  <section aria-labelledby="suggested-fix-heading" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3
                        id="suggested-fix-heading"
                        className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-zinc-200 uppercase"
                      >
                        <Code2 size={13} className="text-indigo-400" aria-hidden="true" />
                        <span>Suggested Remediation</span>
                      </h3>
                      {incident.suggested_fix && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(incident.suggested_fix, 'suggested_fix')}
                          className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                        >
                          {copiedKey === 'suggested_fix' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedKey === 'suggested_fix' ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <pre className="overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap">
                      {incident.suggested_fix || (
                        <span className="text-zinc-500 italic">
                          No automatic remediation generated.
                        </span>
                      )}
                    </pre>
                  </section>
                </div>
              )}

              {/* TAB 2: Stack Trace */}
              {activeTab === 'stack' && (
                <section aria-labelledby="stack-trace-heading" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3
                      id="stack-trace-heading"
                      className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-zinc-200 uppercase"
                    >
                      <Terminal size={13} className="text-zinc-400" aria-hidden="true" />
                      <span>Exception Stack Frames</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(formatStackTrace(incident.stack_trace || incident.traceback), 'stack_trace')}
                      className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                    >
                      {copiedKey === 'stack_trace' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copiedKey === 'stack_trace' ? 'Copied' : 'Copy Trace'}</span>
                    </button>
                  </div>
                  <pre className="max-h-[500px] overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre">
                    {formatStackTrace(incident.stack_trace || incident.traceback)}
                  </pre>
                </section>
              )}

              {/* TAB 3: Telemetry & Context */}
              {activeTab === 'metadata' && (
                <div className="space-y-6">
                  {/* Key Properties Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                      <span className="text-zinc-500 block mb-1 text-[10px] uppercase">Application / Service</span>
                      <span className="text-zinc-200 font-semibold">{incident.application_name || incident.project_name || 'default-app'}</span>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                      <span className="text-zinc-500 block mb-1 text-[10px] uppercase">Environment</span>
                      <span className="text-zinc-200">{incident.context_data?.environment || 'production'}</span>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                      <span className="text-zinc-500 block mb-1 text-[10px] uppercase">Runtime SDK</span>
                      <span className="text-zinc-200">{incident.runtime || 'python'}</span>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                      <span className="text-zinc-500 block mb-1 text-[10px] uppercase">Route / Endpoint</span>
                      <span className="text-zinc-200 truncate">{incident.endpoint || '/'}</span>
                    </div>
                  </div>

                  {/* Raw Context Data */}
                  {incident.context_data && Object.keys(incident.context_data).length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-mono text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                        Client Context Snapshot
                      </h3>
                      <pre className="max-h-60 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-400">
                        {JSON.stringify(incident.context_data, null, 2)}
                      </pre>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/40 px-6 py-4">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            {incident?.ai_duration_seconds ? (
              <>
                <Timer size={12} className="text-sky-400" />
                <span>AI Triage completed in {incident.ai_duration_seconds}s</span>
              </>
            ) : (
              <span>AutoTrace Engine Ready</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-700 bg-zinc-800 px-4 py-1.5 font-mono text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
          >
            Close
          </button>
        </footer>
      </aside>
    </div>
  );
}
