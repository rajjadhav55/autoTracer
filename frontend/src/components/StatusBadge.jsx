const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    classes: 'bg-warning-500/15 text-warning-400 ring-warning-500/30',
    dot: 'bg-warning-400',
  },
  ANALYZING: {
    label: 'Analyzing',
    classes: 'bg-info-500/15 text-info-400 ring-info-500/30',
    dot: 'bg-info-400 animate-pulse-dot',
  },
  TRIAGED: {
    label: 'Triaged',
    classes: 'bg-success-500/15 text-success-400 ring-success-500/30',
    dot: 'bg-success-400',
  },
  FAILED: {
    label: 'Failed',
    classes: 'bg-danger-500/15 text-danger-400 ring-danger-500/30',
    dot: 'bg-danger-400',
  },
  RESOLVED: {
    label: 'Resolved',
    classes: 'bg-accent-500/15 text-accent-400 ring-accent-500/30',
    dot: 'bg-accent-400',
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
