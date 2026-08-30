import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Activity, 
  Database, 
  Terminal, 
  Sliders, 
  ShieldCheck, 
  ArrowUpRight 
} from 'lucide-react';

export default function CoreFeaturesGrid() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI Error Triage',
      subtitle: 'Automated stack trace analysis and root-cause synthesis powered by state-of-the-art LLMs.',
      badge: 'Zero Hallucination'
    },
    {
      icon: Activity,
      title: 'Real-time Telemetry',
      subtitle: 'Sub-millisecond event streaming with distributed trace correlation and breadcrumb capture.',
      badge: 'p99 < 2ms'
    },
    {
      icon: Database,
      title: 'PostgreSQL Backed',
      subtitle: 'Enterprise-grade durability with raw SQL access, schema introspection, and custom index retention.',
      badge: 'ACID Compliant'
    },
    {
      icon: Terminal,
      title: 'Zero-Config SDKs',
      subtitle: '2-line drop-in middleware for Django, FastAPI, Flask, React, Next.js, and raw Python scripts.',
      badge: 'Instant Setup'
    },
    {
      icon: Sliders,
      title: 'Smart Noise Filtering',
      subtitle: 'Intelligent aggregation and deduping that groups millions of raw logs into distinct incidents.',
      badge: '99% De-dupe'
    },
    {
      icon: ShieldCheck,
      title: 'Privacy-First Sanitization',
      subtitle: 'Automatic client-side PII scrubbing, bearer token stripping, and encryption in flight before ingestion.',
      badge: 'SOC2 & HIPAA'
    }
  ];

  return (
    <section id="features" className="py-24 bg-zinc-950 relative border-t border-zinc-900">
      
      {/* Subtle Glow Background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/5 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Engineered for Production</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Everything you need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
              triage at hyperspeed.
            </span>
          </h2>

          <p className="text-zinc-400 text-base sm:text-lg">
            No bloated dashboards. No complex query languages. Just pure, actionable intelligence.
          </p>
        </div>

        {/* 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className="group relative bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-7 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 group-hover:border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-200 shadow-inner">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                    {feat.subtitle}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-mono group-hover:text-zinc-400">
                  <span>Learn more</span>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
