const STATUS_MAP = {
  PENDING: {
    label: 'PENDING',
    dotClass: 'bg-amber-400 animate-pulse',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/10',
  },
  ANALYZING: {
    label: 'ANALYZING',
    dotClass: 'bg-sky-400 animate-pulse',
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-300 shadow-sm shadow-sky-500/10',
  },
  TRIAGED: {
    label: 'AI TRIAGED',
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-semibold',
  },
  FAILED: {
    label: 'FAILED',
    dotClass: 'bg-rose-400',
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-sm shadow-rose-500/10',
  },
  RESOLVED: {
    label: 'RESOLVED',
    dotClass: 'bg-zinc-400',
    badgeClass: 'border-zinc-700/80 bg-zinc-800/80 text-zinc-300',
  },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase transition-all duration-200 backdrop-blur-md ${meta.badgeClass}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dotClass}`}
      />
      <span>{meta.label}</span>
    </span>
  );
}

