import { Activity, Clock, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';

const STATS = [
  {
    key: 'total',
    label: 'TOTAL CAPTURED',
    icon: Terminal,
    textColor: 'text-zinc-100',
  },
  {
    key: 'pending',
    label: 'PENDING TRIAGE',
    icon: Clock,
    textColor: 'text-amber-400',
  },
  {
    key: 'analyzing',
    label: 'AI ANALYZING',
    icon: Activity,
    textColor: 'text-sky-400',
  },
  {
    key: 'triaged',
    label: 'AI TRIAGED',
    icon: CheckCircle2,
    textColor: 'text-emerald-400',
  },
  {
    key: 'failed',
    label: 'TRIAGE FAILED',
    icon: AlertOctagon,
    textColor: 'text-rose-400',
  },
];

export default function MetricsHeader({ counts }) {
  return (
    <div className="grid grid-cols-2 divide-y divide-zinc-800 border border-zinc-800 bg-zinc-900/70 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
      {STATS.map((stat) => {
        const Icon = stat.icon;
        const count = counts?.[stat.key] ?? 0;

        return (
          <div
            key={stat.key}
            className="flex flex-col justify-between px-4 py-3 sm:px-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
                {stat.label}
              </span>
              <Icon
                size={13}
                aria-hidden="true"
                className="text-zinc-400 shrink-0"
              />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span
                className={`font-mono text-2xl font-semibold tracking-tight tabular-nums ${stat.textColor}`}
              >
                {count}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">events</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
