import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { fetchIncidentDetail } from '../services/api';

export default function IncidentDetail({ incidentId, onClose }) {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('triage');

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
      <aside
        className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        {/* Header Bar */}
        <div className="border-b border-zinc-800 bg-zinc-900/90 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                {incident && <StatusBadge status={incident.status} />}
                <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                  {incidentId}
                </span>
              </div>
              <h2
                id="incident-detail-heading"
                className="font-mono text-base font-bold text-zinc-100 truncate"
              >
                {loading ? 'Loading…' : incident?.error_type || 'Incident Detail'}
              </h2>
              {incident?.error_message && (
                <p className="font-mono text-xs text-zinc-400 truncate">
                  {incident.error_message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-1 focus-visible:ring-zinc-400"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Route details */}
          {incident && (
            <div className="mt-3 flex items-center gap-2 border-t border-zinc-800/80 pt-2.5 font-mono text-[11px] text-zinc-400">
              <span className="rounded-[3px] bg-zinc-800 px-1 py-0.2 font-semibold text-zinc-200">
                {incident.http_method || 'POST'}
              </span>
              <span className="text-zinc-300 truncate">{incident.endpoint || '/'}</span>
              <span className="text-zinc-400">•</span>
              <span className="tabular-nums text-zinc-400">
                {incident.created_at ? new Date(incident.created_at).toUTCString() : '—'}
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-3 flex gap-1 border-t border-zinc-800/80 pt-2">
            {[
              { id: 'triage', label: 'AI Diagnosis', icon: Sparkles },
              { id: 'traceback', label: 'Traceback', icon: Terminal },
              { id: 'payload', label: 'Request / Headers', icon: Layers },
              { id: 'diagnostic', label: 'Raw Logs', icon: Cpu },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs transition-colors duration-100 focus-visible:ring-1 focus-visible:ring-zinc-400 ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                      : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <Icon size={12} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div
              aria-live="polite"
              className="flex h-48 flex-col items-center justify-center font-mono text-xs text-zinc-400"
            >
              Loading incident telemetry…
            </div>
          )}

          {error && (
            <div
              aria-live="polite"
              className="border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-300"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={14} aria-hidden="true" />
                Error Loading Incident
              </div>
              <p className="mt-1 text-zinc-300">{error}</p>
            </div>
          )}

          {!loading && !error && incident && (
            <>
              {/* TAB 1: AI DIAGNOSIS */}
              {activeTab === 'triage' && (
                <div className="space-y-4">
                  {/* Root Cause Analysis */}
                  <div className="border border-zinc-800 bg-zinc-900/60 p-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                        Root Cause Analysis
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {incident.diagnostic_logs?.llm_model || 'Gemini 3.6 Flash'}
                      </span>
                    </div>

                    <div className="mt-3 text-xs leading-relaxed text-zinc-200 font-sans">
                      {incident.root_cause ? (
                        <p className="whitespace-pre-wrap">{incident.root_cause}</p>
                      ) : (
                        <p className="font-mono text-zinc-400 italic">
                          {incident.status === 'ANALYZING'
                            ? 'AI Agent is evaluating telemetry…'
                            : 'No diagnosis generated.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Suggested Code Fix */}
                  <div className="border border-zinc-800 bg-zinc-900/60 p-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <span className="font-mono text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                        Remediation / Code Fix
                      </span>
                      {incident.suggested_fix && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(incident.suggested_fix, 'fix')}
                          aria-label="Copy suggested fix to clipboard"
                          className="flex items-center gap-1 font-mono text-[11px] text-zinc-400 hover:text-zinc-200"
                        >
                          {copiedKey === 'fix' ? (
                            <>
                              <Check size={12} aria-hidden="true" className="text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} aria-hidden="true" />
                              <span>Copy Fix</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="mt-3">
                      {incident.suggested_fix ? (
                        <pre className="overflow-x-auto border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                          {incident.suggested_fix}
                        </pre>
                      ) : (
                        <p className="font-mono text-xs text-zinc-400 italic">
                          No remediation code available.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STACK TRACEBACK */}
              {activeTab === 'traceback' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-zinc-400 uppercase">
                      Raw Stack Trace
                    </span>
                    {incident.traceback && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(incident.traceback, 'trace')}
                        aria-label="Copy stack trace"
                        className="flex items-center gap-1 font-mono text-[11px] text-zinc-400 hover:text-zinc-200"
                      >
                        {copiedKey === 'trace' ? (
                          <>
                            <Check size={12} aria-hidden="true" className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} aria-hidden="true" />
                            <span>Copy Trace</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {incident.traceback ? (
                    <pre className="overflow-x-auto border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs leading-relaxed text-rose-300/90 whitespace-pre-wrap">
                      {incident.traceback}
                    </pre>
                  ) : (
                    <p className="font-mono text-xs text-zinc-400 italic">No traceback recorded.</p>
                  )}
                </div>
              )}

              {/* TAB 3: REQUEST & HEADERS */}
              {activeTab === 'payload' && (
                <div className="space-y-4">
                  {/* Headers */}
                  <div className="border border-zinc-800 bg-zinc-900/60 p-4">
                    <span className="font-mono text-[11px] font-semibold text-zinc-400 uppercase">
                      Sanitized HTTP Headers
                    </span>
                    {incident.headers && Object.keys(incident.headers).length > 0 ? (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-left font-mono text-xs">
                          <tbody className="divide-y divide-zinc-850">
                            {Object.entries(incident.headers).map(([key, val]) => (
                              <tr key={key}>
                                <td className="py-1.5 pr-3 text-zinc-400 w-1/3">{key}</td>
                                <td className="py-1.5 text-zinc-200 break-all">{String(val)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-2 font-mono text-xs text-zinc-400 italic">No headers present.</p>
                    )}
                  </div>

                  {/* Body */}
                  <div className="border border-zinc-800 bg-zinc-900/60 p-4">
                    <span className="font-mono text-[11px] font-semibold text-zinc-400 uppercase">
                      Sanitized Body Payload
                    </span>
                    {incident.request_payload && Object.keys(incident.request_payload).length > 0 ? (
                      <pre className="mt-2 overflow-x-auto border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200">
                        {JSON.stringify(incident.request_payload, null, 2)}
                      </pre>
                    ) : (
                      <p className="mt-2 font-mono text-xs text-zinc-400 italic">Empty body payload.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: DIAGNOSTIC LOGS */}
              {activeTab === 'diagnostic' && (
                <div className="space-y-2">
                  <span className="font-mono text-[11px] font-semibold text-zinc-400 uppercase">
                    System Telemetry & Metadata
                  </span>
                  <pre className="overflow-x-auto border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(incident.diagnostic_logs || {}, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
