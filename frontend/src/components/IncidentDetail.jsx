import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Code2,
  Terminal,
  Server,
  Layers,
  Copy,
  Check,
  Clock,
  Globe,
  AlertCircle,
  Cpu,
  FileText,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { fetchIncidentDetail } from '../services/api';

export default function IncidentDetail({ incidentId, onClose, onRefreshList }) {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);
  const [activeTab, setActiveTab] = useState('triage'); // 'triage' | 'traceback' | 'request' | 'diagnostics'

  useEffect(() => {
    if (!incidentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchIncidentDetail(incidentId)
      .then((data) => {
        if (isMounted) {
          setIncident(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || err.message || 'Failed to load incident');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyToClipboard = (text, sectionName) => {
    if (!text) return;
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer panel */}
      <aside
        aria-label="Incident Details Drawer"
        className="animate-slide-in relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface-900 shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-border bg-surface-800/80 px-6 py-5 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {incident && <StatusBadge status={incident.status} />}
                <span className="font-mono text-xs text-text-muted">
                  ID: {incidentId?.slice(0, 8)}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                {loading ? 'Loading incident details...' : incident?.error_type || 'Incident Details'}
              </h2>
              {incident?.error_message && (
                <p className="text-sm text-text-secondary line-clamp-2">
                  {incident.error_message}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-700 hover:text-text-primary"
              title="Close drawer (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick metadata bar */}
          {incident && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 pt-3 text-xs text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Globe size={14} className="text-text-muted" />
                <span className="rounded bg-surface-700 px-1.5 py-0.5 font-mono text-text-primary">
                  {incident.http_method || 'GET'}
                </span>
                <span className="font-mono text-text-primary">{incident.endpoint || '/'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-text-muted" />
                <span>{formatDate(incident.created_at)}</span>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-1 border-t border-border/60 pt-3">
            {[
              { id: 'triage', label: 'AI Triage', icon: Sparkles },
              { id: 'traceback', label: 'Stack Trace', icon: Terminal },
              { id: 'request', label: 'Request Data', icon: Server },
              { id: 'diagnostics', label: 'Diagnostics', icon: Cpu },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-accent-600 text-white shadow-xs'
                      : 'text-text-secondary hover:bg-surface-700/60 hover:text-text-primary'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              <p className="text-sm">Fetching detailed incident telemetry...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-5 text-danger-400">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle size={18} />
                Failed to load incident details
              </div>
              <p className="mt-2 text-sm text-text-secondary">{error}</p>
            </div>
          )}

          {!loading && !error && incident && (
            <>
              {/* TAB 1: AI TRIAGE */}
              {activeTab === 'triage' && (
                <div className="space-y-6 animate-fade-in">
                  {/* AI Root Cause Card */}
                  <div className="relative overflow-hidden rounded-xl border border-accent-500/30 bg-gradient-to-br from-accent-600/10 via-surface-800 to-surface-800 p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-accent-500/20 p-1.5 text-accent-400">
                          <Sparkles size={18} />
                        </div>
                        <h3 className="text-sm font-semibold tracking-wide uppercase text-accent-400">
                          AI Root Cause Analysis
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-700 text-text-muted">
                        Google Gemini
                      </span>
                    </div>

                    {incident.root_cause ? (
                      <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                        {incident.root_cause}
                      </p>
                    ) : (
                      <div className="rounded-lg bg-surface-900/60 p-4 text-center">
                        <p className="text-sm text-text-muted">
                          {incident.status === 'ANALYZING'
                            ? 'AI Agent is currently analyzing this incident...'
                            : incident.status === 'PENDING'
                            ? 'Queued for automated triage.'
                            : 'No root cause available.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Suggested Fix Card */}
                  <div className="rounded-xl border border-border bg-surface-800/80 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-success-500/20 p-1.5 text-success-400">
                          <Code2 size={18} />
                        </div>
                        <h3 className="text-sm font-semibold tracking-wide uppercase text-success-400">
                          Suggested Code Fix
                        </h3>
                      </div>
                      {incident.suggested_fix && (
                        <button
                          onClick={() => copyToClipboard(incident.suggested_fix, 'fix')}
                          className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-primary"
                        >
                          {copiedSection === 'fix' ? (
                            <>
                              <Check size={14} className="text-success-400" />
                              <span className="text-success-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Copy Fix</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {incident.suggested_fix ? (
                      <div className="relative mt-2 overflow-x-auto rounded-lg border border-surface-600 bg-surface-950 p-4 font-mono text-xs leading-relaxed text-text-primary">
                        <pre className="whitespace-pre-wrap">{incident.suggested_fix}</pre>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted italic">
                        No automated fix suggestions generated yet.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: STACK TRACE */}
              {activeTab === 'traceback' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <Terminal size={16} className="text-accent-400" />
                      Exception Stack Trace
                    </div>
                    {incident.traceback && (
                      <button
                        onClick={() => copyToClipboard(incident.traceback, 'traceback')}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-800 px-3 py-1 text-xs text-text-secondary transition-all hover:bg-surface-700 hover:text-text-primary"
                      >
                        {copiedSection === 'traceback' ? (
                          <>
                            <Check size={14} className="text-success-400" />
                            <span className="text-success-400">Copied Traceback</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Traceback</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {incident.traceback ? (
                    <div className="overflow-x-auto rounded-xl border border-surface-600 bg-surface-950 p-4 font-mono text-xs leading-relaxed text-danger-400/90 shadow-inner">
                      <pre className="whitespace-pre-wrap">{incident.traceback}</pre>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-surface-800/40 p-8 text-center text-text-muted">
                      No stack trace recorded.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REQUEST DATA */}
              {activeTab === 'request' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Sanitized Request Payload */}
                  <div className="rounded-xl border border-border bg-surface-800/80 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                        <FileText size={16} className="text-accent-400" />
                        Sanitized Request Payload
                      </div>
                      {incident.request_payload && Object.keys(incident.request_payload).length > 0 && (
                        <button
                          onClick={() => copyToClipboard(incident.request_payload, 'payload')}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
                        >
                          {copiedSection === 'payload' ? <Check size={14} className="text-success-400" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                    {incident.request_payload && Object.keys(incident.request_payload).length > 0 ? (
                      <pre className="overflow-x-auto rounded-lg bg-surface-950 p-4 font-mono text-xs text-text-primary">
                        {JSON.stringify(incident.request_payload, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-xs text-text-muted italic">No request payload recorded or empty body.</p>
                    )}
                  </div>

                  {/* Sanitized Headers */}
                  <div className="rounded-xl border border-border bg-surface-800/80 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                        <Layers size={16} className="text-accent-400" />
                        Sanitized Request Headers
                      </div>
                    </div>
                    {incident.headers && Object.keys(incident.headers).length > 0 ? (
                      <div className="overflow-x-auto rounded-lg bg-surface-950 p-3 font-mono text-xs">
                        <table className="w-full text-left">
                          <tbody>
                            {Object.entries(incident.headers).map(([k, v]) => (
                              <tr key={k} className="border-b border-surface-800 last:border-none">
                                <td className="py-1.5 pr-4 font-medium text-accent-400">{k}</td>
                                <td className="py-1.5 text-text-secondary break-all">{String(v)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">No request headers recorded.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: DIAGNOSTICS & LOGS */}
              {activeTab === 'diagnostics' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <Cpu size={16} className="text-accent-400" />
                      Diagnostic Telemetry & Raw LLM Logs
                    </div>
                    {incident.diagnostic_logs && Object.keys(incident.diagnostic_logs).length > 0 && (
                      <button
                        onClick={() => copyToClipboard(incident.diagnostic_logs, 'diagnostics')}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-800 px-3 py-1 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary"
                      >
                        {copiedSection === 'diagnostics' ? (
                          <>
                            <Check size={14} className="text-success-400" />
                            <span className="text-success-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {incident.diagnostic_logs && Object.keys(incident.diagnostic_logs).length > 0 ? (
                    <pre className="overflow-x-auto rounded-xl border border-surface-600 bg-surface-950 p-4 font-mono text-xs leading-relaxed text-text-primary shadow-inner">
                      {JSON.stringify(incident.diagnostic_logs, null, 2)}
                    </pre>
                  ) : (
                    <div className="rounded-xl border border-border bg-surface-800/40 p-8 text-center text-text-muted">
                      No additional diagnostic logs available.
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
