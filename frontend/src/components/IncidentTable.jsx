import React from 'react';
import StatusBadge from './StatusBadge';
import { Server, ChevronRight, AlertCircle, ArrowUpRight, Radio, Sparkles, Terminal } from 'lucide-react';

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function formatExactTime(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export default function IncidentTable({ incidents, selectedId, onSelect, onSimulateChaos }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl py-20 px-6 text-center shadow-2xl glow-box-neon">
        <div className="pointer-events-none absolute inset-0 bg-radial-gradient-glow opacity-40 -z-10" />
        
        <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center mb-4 text-zinc-400 shadow-inner">
          <Terminal className="w-6 h-6 text-emerald-400" />
        </div>
        
        <h3 className="font-mono text-sm sm:text-base font-bold text-white tracking-tight">
          No live telemetry events captured yet
        </h3>
        <p className="mt-2 text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
          The telemetry pipeline is listening on <code className="text-emerald-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">/api/v1/ingest/</code>. Trigger a simulated chaos error or send exceptions from your SDK.
        </p>

        {onSimulateChaos && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onSimulateChaos('zero_division')}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs px-5 py-2 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:scale-105 cursor-pointer"
            >
              <Sparkles size={13} />
              <span>Simulate ZeroDivisionError</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl shadow-2xl overflow-hidden glow-box-neon">
      
      {/* Mac / Terminal Window Bar Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-zinc-950/90 border-b border-zinc-850">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-inner" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-inner" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-inner" />
          </div>
          <span className="ml-2 font-mono text-xs font-semibold text-zinc-300 flex items-center gap-2">
            <span>autotrace-stream.log</span>
            <span className="text-[10px] text-zinc-500 font-normal">({incidents.length} events active)</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-mono text-[11px] text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            <span className="hidden sm:inline">60 FPS Telemetry Ingestion</span>
          </div>
        </div>
      </div>

      {/* ── MOBILE CARD FEED VIEW (Visible on screens < 640px) ── */}
      <div className="block sm:hidden divide-y divide-zinc-850/80">
        {incidents.map((incident) => {
          const isSelected = incident.id === selectedId;
          const appName = incident.application_name || incident.project_name || 'default-app';

          return (
            <div
              key={incident.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(incident.id)}
              className={`p-4 transition-all duration-200 cursor-pointer active:bg-zinc-800/80 ${
                isSelected
                  ? 'bg-zinc-850/90 border-l-4 border-l-emerald-400 text-white'
                  : 'hover:bg-zinc-850/40 text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <StatusBadge status={incident.status} />
                <span className="text-[11px] font-mono text-zinc-400">
                  {formatRelativeTime(incident.created_at)}
                </span>
              </div>

              <div className="space-y-1 mb-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                    {incident.error_type}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                {incident.error_message && (
                  <p className="text-xs text-zinc-300 line-clamp-2 font-mono leading-relaxed pt-1">
                    {incident.error_message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center gap-1.5 truncate">
                  <Server className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate text-zinc-300">{appName}</span>
                </div>
                {incident.endpoint && (
                  <span className="truncate max-w-[130px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
                    {incident.endpoint}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE VIEW (Visible on screens >= 640px) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-850 bg-zinc-950/60 text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
              <th scope="col" className="py-3.5 pl-6 pr-3 w-36">Status</th>
              <th scope="col" className="py-3.5 px-3 w-44">Service / App</th>
              <th scope="col" className="py-3.5 px-3">Exception / Message</th>
              <th scope="col" className="py-3.5 px-3 w-52">Route / Endpoint</th>
              <th scope="col" className="py-3.5 pl-3 pr-6 text-right w-36">Timestamp</th>
              <th scope="col" className="py-3.5 pr-5 text-right w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850/60 font-sans text-xs">
            {incidents.map((incident) => {
              const isSelected = incident.id === selectedId;
              const appName = incident.application_name || incident.project_name || 'default-app';

              return (
                <tr
                  key={incident.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Inspect incident ${incident.error_type} at ${incident.endpoint || 'unknown endpoint'}`}
                  onClick={() => onSelect(incident.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(incident.id);
                    }
                  }}
                  className={`group cursor-pointer transition-all duration-150 focus-visible:outline-none ${
                    isSelected
                      ? 'bg-zinc-850/90 border-l-4 border-l-emerald-400 text-white'
                      : 'text-zinc-300 hover:bg-zinc-850/50 hover:text-zinc-100 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Status Column */}
                  <td className="py-3.5 pl-5 pr-3 align-middle">
                    <StatusBadge status={incident.status} />
                  </td>

                  {/* Application Name */}
                  <td className="py-3.5 px-3 align-middle font-mono text-xs text-zinc-200">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 truncate">
                      <Server className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="truncate font-medium">{appName}</span>
                    </div>
                  </td>

                  {/* Error & Message Column */}
                  <td className="py-3.5 px-3 align-middle min-w-0 max-w-xs sm:max-w-md">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md shrink-0 group-hover:border-rose-500/40 transition-colors">
                        {incident.error_type}
                      </span>
                      {incident.error_message && (
                        <span className="truncate text-xs text-zinc-400 group-hover:text-zinc-200 min-w-0 font-mono">
                          {incident.error_message}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Route & HTTP Method */}
                  <td className="py-3.5 px-3 align-middle font-mono text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      {incident.http_method && (
                        <span className="rounded-md bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 shrink-0">
                          {incident.http_method}
                        </span>
                      )}
                      <span className="truncate bg-zinc-950/80 border border-zinc-850 px-2 py-0.5 rounded-md text-zinc-400 font-mono text-[11px]" title={incident.endpoint || '—'}>
                        {incident.endpoint || '—'}
                      </span>
                    </div>
                  </td>

                  {/* Timestamp */}
                  <td
                    className="py-3.5 pl-3 pr-6 text-right font-mono text-xs text-zinc-400 tabular-nums align-middle"
                    title={formatExactTime(incident.created_at)}
                  >
                    {formatRelativeTime(incident.created_at)}
                  </td>

                  {/* Action badge */}
                  <td className="py-3.5 pr-5 text-right align-middle">
                    <div className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 group-hover:text-emerald-400 transition-colors">
                      <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">Triage</span>
                      <ChevronRight
                        size={14}
                        aria-hidden="true"
                        className="text-zinc-600 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
