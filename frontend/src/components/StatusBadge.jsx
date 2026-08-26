const STATUS_MAP = {
  PENDING: {
    label: 'PENDING',
    dotClass: 'bg-amber-400',
    badgeClass: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },
  ANALYZING: {
    label: 'ANALYZING',
    dotClass: 'bg-sky-400 animate-pulse-pip',
    badgeClass: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  },
  TRIAGED: {
    label: 'TRIAGED',
    dotClass: 'bg-emerald-400',
    badgeClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  FAILED: {
    label: 'FAILED',
    dotClass: 'bg-rose-400',
    badgeClass: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  },
  RESOLVED: {
    label: 'RESOLVED',
    dotClass: 'bg-zinc-400',
    badgeClass: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase ${meta.badgeClass}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`}
      />
      <span>{meta.label}</span>
    </span>
  );
}
