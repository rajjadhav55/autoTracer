import React from 'react';
import StatusBadge from './StatusBadge';
import { Server, ChevronRight, AlertCircle, ArrowUpRight, Radio } from 'lucide-react';

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

export default function IncidentTable({ incidents, selectedId, onSelect }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl py-16 px-4 text-center rounded-2xl glow-box-neon">
        <div className="w-10 h-10 rounded-full bg-zinc-850 border border-zinc-700 flex items-center justify-center mb-3">
          <AlertCircle className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="font-mono text-sm font-semibold text-zinc-200">
          No matching incident events recorded
        </p>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm">
          Trigger a simulated error or dispatch client SDK events to populate this live stream.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl shadow-2xl overflow-hidden glow-box-neon">
      
      {/* Mac / Terminal Window Bar Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/80 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          <span className="ml-2 font-mono text-xs font-semibold text-zinc-300">
            live-telemetry-feed.log
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
          <Radio className="w-3 h-3 animate-pulse" />
          <span className="hidden sm:inline">60 FPS Ingestion Buffer</span>
        </div>
      </div>

      {/* ── MOBILE CARD FEED VIEW (Visible on screens < 640px) ── */}
      <div className="block sm:hidden divide-y divide-zinc-850">
        {incidents.map((incident) => {
          const isSelected = incident.id === selectedId;
          const appName = incident.application_name || incident.project_name || 'default-app';

          return (
            <div
              key={incident.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(incident.id)}
              className={`p-4 transition-all duration-150 cursor-pointer active:bg-zinc-850 ${
                isSelected ? 'bg-zinc-850/90 text-white' : 'hover:bg-zinc-850/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <StatusBadge status={incident.status} />
                <span className="text-[11px] font-mono text-zinc-400">
                  {formatRelativeTime(incident.created_at)}
                </span>
              </div>

              <div className="space-y-1 mb-2.5">
                <div className="font-mono text-xs font-bold text-red-400 flex items-center justify-between">
                  <span className="hover:underline">{incident.error_type}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                {incident.error_message && (
                  <p className="text-xs text-zinc-300 line-clamp-2 font-mono leading-relaxed">
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
                  <span className="truncate max-w-[130px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
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
            <tr className="border-b border-zinc-800/80 bg-zinc-950/40 text-[11px] font-mono font-medium tracking-wider text-zinc-400 uppercase">
              <th scope="col" className="py-3 pl-5 pr-3 w-32">Status</th>
              <th scope="col" className="py-3 px-3 w-40">Service / Runtime</th>
              <th scope="col" className="py-3 px-3">Exception / Message</th>
              <th scope="col" className="py-3 px-3 w-52">Route / Endpoint</th>
              <th scope="col" className="py-3 pl-3 pr-5 text-right w-36">Timestamp</th>
              <th scope="col" className="py-3 pr-4 text-right w-12"></th>
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
                  className={`group cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:bg-zinc-800/70 ${
                    isSelected
                      ? 'bg-zinc-850/90 text-white'
                      : 'text-zinc-300 hover:bg-zinc-850/50 hover:text-zinc-100'
                  }`}
                >
                  {/* Status Column */}
                  <td className="py-3.5 pl-5 pr-3 align-middle">
                    <StatusBadge status={incident.status} />
                  </td>

                  {/* Application Name */}
                  <td className="py-3.5 px-3 align-middle font-mono text-xs text-zinc-200">
                    <div className="flex items-center gap-1.5 truncate">
                      <Server className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate font-semibold">{appName}</span>
                    </div>
                  </td>

                  {/* Error & Message Column */}
                  <td className="py-3.5 px-3 align-middle min-w-0 max-w-xs sm:max-w-md">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-red-400 group-hover:text-red-300 shrink-0">
                        {incident.error_type}
                      </span>
                      {incident.error_message && (
                        <span className="truncate text-xs text-zinc-400 group-hover:text-zinc-300 min-w-0 font-mono">
                          — {incident.error_message}
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
                      <span className="truncate bg-zinc-950/60 border border-zinc-850/80 px-2 py-0.5 rounded-md" title={incident.endpoint || '—'}>
                        {incident.endpoint || '—'}
                      </span>
                    </div>
                  </td>

                  {/* Timestamp */}
                  <td
                    className="py-3.5 pl-3 pr-5 text-right font-mono text-xs text-zinc-400 tabular-nums align-middle"
                    title={formatExactTime(incident.created_at)}
                  >
                    {formatRelativeTime(incident.created_at)}
                  </td>

                  {/* Action arrow */}
                  <td className="py-3.5 pr-4 text-right align-middle">
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className="inline-block text-zinc-600 group-hover:text-emerald-400 transition-all group-hover:translate-x-0.5"
                    />
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
