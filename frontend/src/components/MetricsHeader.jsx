import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';

const CARDS = [
  {
    key: 'total',
    label: 'Total Incidents',
    icon: BarChart3,
    gradient: 'from-accent-600/20 to-accent-500/5',
    iconColor: 'text-accent-400',
    border: 'border-accent-500/20',
  },
  {
    key: 'pending',
    label: 'Pending Triage',
    icon: AlertTriangle,
    gradient: 'from-warning-500/20 to-warning-500/5',
    iconColor: 'text-warning-400',
    border: 'border-warning-500/20',
  },
  {
    key: 'triaged',
    label: 'Triaged',
    icon: CheckCircle2,
    gradient: 'from-success-500/20 to-success-500/5',
    iconColor: 'text-success-400',
    border: 'border-success-500/20',
  },
  {
    key: 'failed',
    label: 'Failed',
    icon: XCircle,
    gradient: 'from-danger-500/20 to-danger-500/5',
    iconColor: 'text-danger-400',
    border: 'border-danger-500/20',
  },
];

export default function MetricsHeader({ counts }) {
  return (
    <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = counts?.[card.key] ?? 0;

        return (
          <div
            key={card.key}
            className={`relative overflow-hidden rounded-xl border ${card.border} bg-gradient-to-br ${card.gradient} p-5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-surface-900/50`}
          >
            {/* Glow effect */}
            <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/[0.03] blur-2xl" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  {card.label}
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
                  {value}
                </p>
              </div>
              <div className={`rounded-lg bg-surface-800/50 p-2.5 ${card.iconColor}`}>
                <Icon size={22} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
