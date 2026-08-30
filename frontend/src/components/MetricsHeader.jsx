import { Activity, Clock, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';

const STATS = [
  {
    key: 'total',
    label: 'TOTAL CAPTURED',
    icon: Terminal,
    textColor: 'text-zinc-100',
    dotColor: 'bg-zinc-300',
    glow: 'hover:border-zinc-700',
  },
  {
    key: 'pending',
    label: 'PENDING TRIAGE',
    icon: Clock,
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-400',
    glow: 'hover:border-amber-500/40',
  },
  {
    key: 'analyzing',
    label: 'AI ANALYZING',
    icon: Activity,
    textColor: 'text-sky-400',
    dotColor: 'bg-sky-400',
    glow: 'hover:border-sky-500/40',
  },
  {
    key: 'triaged',
    label: 'AI TRIAGED',
    icon: CheckCircle2,
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    glow: 'hover:border-emerald-500/50 shadow-sm shadow-emerald-500/5',
  },
  {
    key: 'failed',
    label: 'TRIAGE FAILED',
    icon: AlertOctagon,
    textColor: 'text-rose-400',
    dotColor: 'bg-rose-400',
    glow: 'hover:border-rose-500/40',
  },
];

export default function MetricsHeader({ counts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {STATS.map((stat, idx) => {
        const Icon = stat.icon;
        const count = counts?.[stat.key] ?? 0;
        const isLastOnMobile = idx === STATS.length - 1;

        return (
          <div
            key={stat.key}
            className={`relative rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${stat.glow} ${
              isLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stat.dotColor}`} />
                <span className="font-mono text-[10px] sm:text-[11px] font-medium tracking-wider text-zinc-400 uppercase truncate">
                  {stat.label}
                </span>
              </div>
              <Icon
                size={14}
                aria-hidden="true"
                className="text-zinc-500 shrink-0"
              />
            </div>
            
            <div className="flex items-baseline justify-between gap-1.5">
              <span
                className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${stat.textColor}`}
              >
                {count}
              </span>
              <span className="text-[11px] font-mono text-zinc-500">events</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
