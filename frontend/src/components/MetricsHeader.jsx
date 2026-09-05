import { Activity, Clock, CheckCircle2, AlertOctagon, Terminal, TrendingUp } from 'lucide-react';

const STATS = [
  {
    key: 'total',
    label: 'TOTAL CAPTURED',
    icon: Terminal,
    textColor: 'text-zinc-100',
    dotColor: 'bg-zinc-400',
    iconBg: 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300',
    glowHover: 'group-hover:border-zinc-700',
    cornerGlow: 'bg-zinc-400/5 group-hover:bg-zinc-400/10',
    subtitle: 'Stream buffer active',
    bars: [30, 45, 60, 50, 75, 90, 80],
  },
  {
    key: 'pending',
    label: 'PENDING TRIAGE',
    icon: Clock,
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-400 animate-pulse',
    iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    glowHover: 'group-hover:border-amber-500/40',
    cornerGlow: 'bg-amber-500/5 group-hover:bg-amber-500/10',
    subtitle: 'Awaiting LLM parse',
    bars: [20, 30, 45, 35, 25, 40, 30],
  },
  {
    key: 'analyzing',
    label: 'AI ANALYZING',
    icon: Activity,
    textColor: 'text-sky-400',
    dotColor: 'bg-sky-400 animate-pulse',
    iconBg: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    glowHover: 'group-hover:border-sky-500/40',
    cornerGlow: 'bg-sky-500/5 group-hover:bg-sky-500/10',
    subtitle: 'Deconstructing frames',
    bars: [40, 55, 70, 60, 80, 65, 75],
  },
  {
    key: 'triaged',
    label: 'AI TRIAGED',
    icon: CheckCircle2,
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    iconBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    glowHover: 'group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/10',
    cornerGlow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
    subtitle: 'Root cause identified',
    bars: [60, 75, 90, 85, 95, 90, 100],
  },
  {
    key: 'failed',
    label: 'TRIAGE FAILED',
    icon: AlertOctagon,
    textColor: 'text-rose-400',
    dotColor: 'bg-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    glowHover: 'group-hover:border-rose-500/40',
    cornerGlow: 'bg-rose-500/5 group-hover:bg-rose-500/10',
    subtitle: 'Requires manual review',
    bars: [15, 20, 10, 25, 15, 10, 5],
  },
];

export default function MetricsHeader({ counts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
      {STATS.map((stat, idx) => {
        const Icon = stat.icon;
        const count = counts?.[stat.key] ?? 0;
        const isLastOnMobile = idx === STATS.length - 1;

        return (
          <div
            key={stat.key}
            className={`group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden ${stat.glowHover} ${
              isLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            {/* Ambient Corner Glow Accent matching Landing Page Bento */}
            <div
              className={`pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-all duration-300 ${stat.cornerGlow}`}
            />

            {/* Top row: Label & Squircle Icon */}
            <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stat.dotColor}`} />
                <span className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-wider text-zinc-400 uppercase truncate">
                  {stat.label}
                </span>
              </div>
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${stat.iconBg}`}
              >
                <Icon size={14} aria-hidden="true" />
              </div>
            </div>

            {/* Metric Value */}
            <div className="flex items-baseline justify-between gap-1.5 mb-2.5 relative z-10">
              <span
                className={`font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${stat.textColor}`}
              >
                {count}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500">events</span>
            </div>

            {/* Bottom Row: Micro trend bars & Subtitle */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-500 relative z-10">
              <span className="truncate max-w-[110px]">{stat.subtitle}</span>
              <div className="flex items-end gap-0.5 h-3 shrink-0">
                {stat.bars.map((height, i) => (
                  <span
                    key={i}
                    style={{ height: `${height}%` }}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      stat.key === 'triaged'
                        ? 'bg-emerald-500/40 group-hover:bg-emerald-400'
                        : stat.key === 'pending'
                        ? 'bg-amber-500/40 group-hover:bg-amber-400'
                        : stat.key === 'analyzing'
                        ? 'bg-sky-500/40 group-hover:bg-sky-400'
                        : stat.key === 'failed'
                        ? 'bg-rose-500/40 group-hover:bg-rose-400'
                        : 'bg-zinc-600/40 group-hover:bg-zinc-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
