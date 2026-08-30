import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Sparkles, 
  Radio, 
  Search, 
  TrendingDown, 
  Activity, 
  ShieldCheck, 
  Check, 
  Copy 
} from 'lucide-react';
import FluidEnergyBackground from './FluidEnergyBackground';

export default function HeroSection({ onStartFree, onReadDocs, onLaunchDashboard }) {
  const [selectedIncident, setSelectedIncident] = useState(0);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const incidents = [
    {
      id: 'inc-9021',
      type: 'CRITICAL',
      typeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      error: 'ZeroDivisionError: float division by zero',
      location: 'services/checkout/pricing.py:84',
      time: 'Just now',
      impact: '142 users affected',
      aiVerdict: 'Division by zero when basket discount rate is exactly 1.0 (100%).',
      aiConfidence: '99.4%',
      suggestedFix: 'if total_discount >= 1.0: return Decimal("0.00")',
      status: 'TRIAGED_BY_AI'
    },
    {
      id: 'inc-9020',
      type: 'HIGH',
      typeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      error: 'OperationalError: connection pool exhausted',
      location: 'core/database/pool.py:112',
      time: '4m ago',
      impact: '89 requests retried',
      aiVerdict: 'Unclosed transaction session inside background webhook worker.',
      aiConfidence: '97.8%',
      suggestedFix: 'async with db.transaction(): await process_webhook()',
      status: 'RESOLVED'
    },
    {
      id: 'inc-9019',
      type: 'MEDIUM',
      typeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      error: 'JWTDecodeError: Signature has expired',
      location: 'middleware/auth.py:49',
      time: '12m ago',
      impact: '12 stale sessions',
      aiVerdict: 'Client refreshed auth token with clock skew of +30s.',
      aiConfidence: '96.2%',
      suggestedFix: 'jwt.decode(token, leeway=60, algorithms=["RS256"])',
      status: 'AUTO_FILTERED'
    }
  ];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <section className="relative overflow-x-clip pt-28 pb-20 md:pt-36 md:pb-28 lg:pt-40 lg:pb-32 bg-transparent flex flex-col justify-between">
      
      {/* ── 1. Relay Template Style Background Planet / Airflow Aura Canvas ── */}
      <div className="pointer-events-none absolute top-0 left-[55%] z-0 aspect-square w-[880px] max-w-[170vw] -translate-x-1/2 translate-y-[22%] scale-110 overflow-visible [mask-image:radial-gradient(ellipse_at_center,black_42%,transparent_76%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_42%,transparent_76%)] md:w-[1240px] md:translate-y-[4%] lg:w-[1520px]">
        <FluidEnergyBackground />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        
        {/* ── 2. Top Pill Badge: What's New? ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300 shadow-inner backdrop-blur-md">
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-[11px] font-semibold text-white">
              What's New?
            </span>
            <span className="text-zinc-200 font-medium">AutoTrace AI is here</span>
          </div>
        </motion.div>

        {/* ── 3. Split Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16">
          
          {/* Left Column: Bold 3-line Headline & Subtitle */}
          <div className="lg:col-span-7 space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.06]"
            >
              From error<br />
              to resolution,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-lime-300">
                without the wait
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-base sm:text-lg text-zinc-400 max-w-xl font-normal leading-relaxed"
            >
              AutoTrace is an AI-powered telemetry and error tracking platform with instant stack trace triage, remote error diagnosis, and automated fix PRs for Python &amp; React. Zero-to-trace in ~15s — ship with confidence, not alert anxiety.
            </motion.p>
          </div>

          {/* Right Column: Green Pill & Dark Outline Pill Buttons + Stat */}
          <div className="lg:col-span-5 flex flex-col lg:items-end space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto"
            >
              {/* Green Primary Pill Button */}
              <button
                onClick={onStartFree}
                className="w-full sm:w-auto px-6 sm:px-7 py-3.5 rounded-full font-semibold text-sm bg-emerald-400 hover:bg-emerald-300 text-zinc-950 transition-all duration-200 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-400/50 hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start tracking free</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Dark Outline Pill Button */}
              <button
                onClick={onReadDocs}
                className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-full font-medium text-sm text-zinc-200 hover:text-white bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer font-mono backdrop-blur-md"
              >
                <span>Read the docs</span>
                <span className="text-emerald-400 text-xs">&gt;_</span>
              </button>
            </motion.div>
          </div>

        </div>

        {/* ── 4. Dashboard Mockup Window Peeking from Below ── */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-6xl mx-auto mt-4"
        >
          <div className="relative rounded-t-2xl bg-zinc-950/90 border-t border-l border-r border-zinc-800 shadow-2xl backdrop-blur-xl overflow-hidden glow-box-neon">
            
            {/* Top Mac Window Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/95 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 pl-2">
                  <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                    AT
                  </span>
                  <span className="text-zinc-200 font-semibold">autotrace</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-400">production/web</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-400">
                  <Search className="w-3 h-3 text-zinc-500" />
                  <span>Search traces, exceptions &amp; runs...</span>
                  <span className="text-[10px] text-zinc-600 border border-zinc-700 rounded px-1">⌘K</span>
                </div>

                <button
                  onClick={onLaunchDashboard}
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Open Console</span>
                </button>
              </div>
            </div>

            {/* Metric Strip inside Mockup */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-950/70 border-b border-zinc-800/80">
              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Incident MTTR</span>
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono flex items-baseline gap-2">
                  <span>1.2 min</span>
                  <span className="text-[11px] text-emerald-400">-74.2%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>AI Auto-Triage</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  <span>98.6%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Events Ingest</span>
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  <span>42.8k/s</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Noise Filtered</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  <span>99.1%</span>
                </div>
              </div>
            </div>

            {/* Interactive Mockup Body: Incident Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12">
              
              {/* Left Column: Live Incidents */}
              <div className="lg:col-span-5 p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 space-y-2 bg-zinc-950/60">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-zinc-400 uppercase font-mono">
                    Active Telemetry Feed
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Live Stream</span>
                </div>

                <div className="space-y-2">
                  {incidents.map((inc, index) => (
                    <button
                      key={inc.id}
                      onClick={() => setSelectedIncident(index)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedIncident === index 
                          ? 'bg-zinc-850 border-emerald-500/50 shadow-md shadow-emerald-500/10' 
                          : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-850'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${inc.typeColor}`}>
                          {inc.type}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">{inc.time}</span>
                      </div>
                      <p className="text-xs font-mono text-zinc-200 font-semibold truncate">
                        {inc.error}
                      </p>
                      <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                        {inc.location}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: AI Triage Insight & Automated Fix */}
              <div className="lg:col-span-7 p-4 sm:p-5 bg-zinc-950/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase font-mono">
                        AutoTrace Diagnostic Engine
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Confidence: {incidents[selectedIncident].aiConfidence}
                    </span>
                  </div>

                  {/* AI Root Cause Synthesis */}
                  <div className="mb-3">
                    <span className="text-[11px] uppercase text-zinc-400 font-mono block mb-1">
                      Root Cause
                    </span>
                    <p className="text-xs text-zinc-200 bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5 font-mono leading-relaxed">
                      {incidents[selectedIncident].aiVerdict}
                    </p>
                  </div>

                  {/* Suggested Code Patch */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] uppercase text-zinc-400 font-mono">
                        Generated Fix Patch
                      </span>
                      <button
                        onClick={() => handleCopy(incidents[selectedIncident].suggestedFix)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                      >
                        {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedSnippet ? 'Copied' : 'Copy diff'}
                      </button>
                    </div>
                    <pre className="text-xs font-mono bg-zinc-900/90 border border-emerald-500/20 text-emerald-300 p-3 rounded-lg overflow-x-auto">
                      <code>+ {incidents[selectedIncident].suggestedFix}</code>
                    </pre>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Real-time telemetry stream attached
                  </span>
                  <button 
                    onClick={onLaunchDashboard}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Open Live Trace &rarr;
                  </button>
                </div>
              </div>

            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
