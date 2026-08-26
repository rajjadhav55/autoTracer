import { Clock, ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export default function IncidentTable({ incidents, selectedId, onSelect }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center rounded-xl border border-border bg-surface-800/40 py-20 text-center">
        <div className="mb-3 rounded-full bg-surface-700 p-4">
          <Clock size={28} className="text-text-muted" />
        </div>
        <p className="text-lg font-medium text-text-secondary">
          No incidents yet
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Errors captured by AutoTrace will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-surface-800/40 backdrop-blur-sm">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr] gap-4 border-b border-border bg-surface-800/60 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <span>Status</span>
        <span>Error</span>
        <span>Endpoint</span>
        <span className="text-right">Time</span>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-border">
        {incidents.map((incident, i) => {
          const isSelected = incident.id === selectedId;

          return (
            <button
              key={incident.id}
              onClick={() => onSelect(incident.id)}
              className={`grid w-full grid-cols-[1fr_1.2fr_0.8fr_0.6fr] gap-4 px-5 py-3.5 text-left text-sm transition-all duration-200 hover:bg-surface-700/50 ${
                isSelected
                  ? 'bg-accent-500/10 border-l-2 border-l-accent-500'
                  : 'border-l-2 border-l-transparent'
              }`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center">
                <StatusBadge status={incident.status} />
              </div>

              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">
                  {incident.error_type}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-muted">
                  {incident.error_message}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-text-secondary">
                <span className="rounded bg-surface-700 px-1.5 py-0.5 font-mono text-xs text-text-muted">
                  {incident.http_method || '—'}
                </span>
                <span className="truncate text-xs">{incident.endpoint || '—'}</span>
              </div>

              <div className="flex items-center justify-end gap-1 text-xs text-text-muted">
                <Clock size={12} />
                {formatTime(incident.created_at)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
