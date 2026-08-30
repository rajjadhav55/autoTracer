import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Activity, 
  Terminal, 
  GitPullRequest, 
  Layers, 
  Check, 
  Cpu, 
  Database,
  Radio
} from 'lucide-react';

export default function BentoGrid() {
  const [latencyPings, setLatencyPings] = useState([24, 18, 35, 12, 19, 28, 15, 22, 14, 18, 16, 20]);
  const [liveLogCount, setLiveLogCount] = useState(14820);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatencyPings(prev => [...prev.slice(1), Math.floor(Math.random() * 18) + 10]);
      setLiveLogCount(c => c + Math.floor(Math.random() * 5) + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="bento" className="py-24 bg-zinc-950 relative border-t border-zinc-900 overflow-hidden">
      
      {/* Subtle Background Glow Accent */}
      <div className="absolute top-1/2 right-10 w-96 h-96 rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Developer-First Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Built for teams who{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
              ship every day.
            </span>
          </h2>

          <p className="text-zinc-400 text-base sm:text-lg">
            A comprehensive telemetry platform engineered from the ground up for high-velocity engineering teams.
          </p>
        </div>

        {/* Bento Grid Layout (5 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6">
          
          {/* Card 1 (Large - Col Span 7): AI Root Cause Synthesis */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-all duration-300" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">AI Autonomous Root Cause Engine</h3>
                    <p className="text-xs text-zinc-400 font-mono">LLM-assisted stack trace deconstruction</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  99.4% Precision
                </span>
              </div>

              <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                AutoTrace doesn't just display cryptic stack traces. Our AI engine correlates local variables, commit history, and runtime context to diagnose the exact flaw in plain English.
              </p>
            </div>

            {/* Visual Mini UI Widget: Live Triage Card */}
            <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 font-mono text-xs space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-zinc-200 font-semibold">Triage Insight #8492</span>
                </div>
                <span className="text-zinc-500 text-[11px]">Identified in 1.1s</span>
              </div>

              <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 text-zinc-300">
                <span className="text-emerald-400 font-semibold">Cause: </span>
                <span>Unvalidated `user_tier` parameter inside `billing/subscription.py:61` resulted in a `KeyError: 'enterprise'`.</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span className="text-zinc-500">Blame: commit 7f3b9a (PR #118)</span>
                <span className="text-emerald-400 font-medium">Confidence Score: 98.9%</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2 (Col Span 5): Real-time Latency Engine */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">&lt;2ms Ingestion Pipeline</h3>
                  <p className="text-xs text-zinc-400 font-mono">Zero-impact non-blocking telemetry</p>
                </div>
              </div>

              <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                Asynchronous event pooling handles millions of exceptions without blocking the Python GIL or React render cycle.
              </p>
            </div>

            {/* Visual Mini UI Widget: Live Latency Sparkline */}
            <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 font-mono">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-zinc-400">P99 Ingestion Latency</span>
                <span className="text-emerald-400 font-bold">1.42 ms</span>
              </div>

              {/* Sparkline Bar Visualization */}
              <div className="flex items-end gap-1.5 h-16 pt-2">
                {latencyPings.map((val, idx) => (
                  <div key={idx} className="flex-1 bg-zinc-800 rounded-t flex flex-col justify-end h-full">
                    <div 
                      style={{ height: `${(val / 40) * 100}%` }}
                      className={`w-full rounded-t transition-all duration-500 ${
                        idx === latencyPings.length - 1 
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400' 
                          : 'bg-emerald-500/40'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-2">
                <span>0.0ms</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> Live Stream
                </span>
                <span>4.0ms max</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3 (Col Span 4): Live Error Stream & Deduplication */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Smart Deduplication</h3>
                  <p className="text-xs text-zinc-400 font-mono">100k logs → 1 clean incident</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                Group cascading errors and filter noise with recursive fingerprinting algorithms.
              </p>
            </div>

            {/* Visual Mini UI Widget: Mock Terminal Log Feed */}
            <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-3 font-mono text-[11px] space-y-2">
              <div className="flex items-center justify-between text-zinc-500 text-[10px] pb-1 border-b border-zinc-800/80">
                <span>TELEMETRY_INGEST</span>
                <span className="text-emerald-400 font-semibold">{liveLogCount.toLocaleString()} events</span>
              </div>
              <div className="text-rose-400 flex items-center gap-1 truncate">
                <span className="px-1 py-0.2 bg-rose-500/10 rounded text-[9px] font-bold">ERR</span>
                <span className="truncate">ConnectionResetError: Redis socket closed</span>
              </div>
              <div className="text-amber-400 flex items-center gap-1 truncate">
                <span className="px-1 py-0.2 bg-amber-500/10 rounded text-[9px] font-bold">WARN</span>
                <span className="truncate">Slow query: SELECT * FROM traces (240ms)</span>
              </div>
              <div className="text-emerald-400 flex items-center gap-1 truncate">
                <span className="px-1 py-0.2 bg-emerald-500/10 rounded text-[9px] font-bold">OK</span>
                <span className="truncate">AI deduplication matched 4,129 traces</span>
              </div>
            </div>
          </motion.div>

          {/* Card 4 (Col Span 4): Automated Pull Request Fix Generator */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <GitPullRequest className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Instant GitHub PRs</h3>
                  <p className="text-xs text-zinc-400 font-mono">1-click automated fix patches</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                AutoTrace drafts test-covered pull requests so you can review and merge before customers even notice.
              </p>
            </div>

            {/* Visual Mini UI Widget: Git Diff */}
            <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-3 font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-[10px] pb-1 border-b border-zinc-800">
                <span>diff --git a/auth.py</span>
                <span className="text-emerald-400">AutoTrace-Bot</span>
              </div>
              <div className="text-rose-400 bg-rose-500/5 px-1 py-0.5 rounded truncate">
                - return payload["user_id"]
              </div>
              <div className="text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded truncate">
                + return payload.get("user_id", None)
              </div>
              <div className="pt-1 flex justify-end">
                <span className="px-2 py-0.5 rounded bg-emerald-400 text-zinc-950 font-bold text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready to Merge
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 5 (Col Span 4): Multi-Cluster & Framework Correlation */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Full-Stack Trace Sync</h3>
                  <p className="text-xs text-zinc-400 font-mono">React ↔ Python ↔ PostgreSQL</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                Trace a client-side React UI unhandled exception all the way down to the PostgreSQL slow lock query.
              </p>
            </div>

            {/* Visual Mini UI Widget: Connected Nodes */}
            <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-3 font-mono text-[11px] flex items-center justify-around">
              <div className="text-center">
                <div className="w-7 h-7 mx-auto rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-zinc-400">React UI</span>
              </div>
              
              <div className="h-0.5 w-8 bg-gradient-to-r from-sky-400 to-emerald-400 relative">
                <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 animate-ping" />
              </div>

              <div className="text-center">
                <div className="w-7 h-7 mx-auto rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-zinc-400">Python API</span>
              </div>

              <div className="h-0.5 w-8 bg-gradient-to-r from-emerald-400 to-indigo-400" />

              <div className="text-center">
                <div className="w-7 h-7 mx-auto rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-1">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-zinc-400">Postgres</span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
