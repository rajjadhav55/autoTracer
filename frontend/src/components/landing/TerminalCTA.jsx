import { useState } from 'react';
import { 
  Terminal, 
  Check, 
  Copy, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';

export default function TerminalCTA({ onStartFree, onOpenConsole }) {
  const [activePkg, setActivePkg] = useState('pip');
  const [copied, setCopied] = useState(false);

  const commands = {
    pip: 'pip install autotrace',
    npm: 'npm install @autotrace/react',
    docker: 'docker run -p 8000:8000 ghcr.io/autotrace/agent:latest'
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(commands[activePkg]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="terminal-cta" className="py-24 bg-zinc-950 relative border-t border-zinc-900 overflow-hidden">
      
      {/* Background Glowing Orb Accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-emerald-500/15 blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400 mb-6">
          <Terminal className="w-3.5 h-3.5" />
          <span>Instant CLI Deployment</span>
        </div>

        {/* Section Heading */}
        <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
          Ship from your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-teal-300">
            terminal.
          </span>
        </h2>

        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto mb-10">
          Get real-time AI error triage running in your stack in under two minutes. 
          Generous free tier, no credit card required.
        </p>

        {/* Dark Terminal Box */}
        <div className="max-w-2xl mx-auto rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl overflow-hidden glow-box-neon mb-10">
          
          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/90 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 text-xs font-mono text-zinc-400">bash — 80x24</span>
            </div>

            {/* Package Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              {['pip', 'npm', 'docker'].map((pkg) => (
                <button
                  key={pkg}
                  onClick={() => setActivePkg(pkg)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                    activePkg === pkg 
                      ? 'bg-zinc-800 text-emerald-400 font-semibold' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {pkg}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Command Line */}
          <div className="p-4 sm:p-6 bg-zinc-950/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 font-mono text-sm sm:text-base">
            <div className="flex items-center gap-3 text-left overflow-x-auto min-w-0">
              <span className="text-emerald-400 font-bold select-none">$</span>
              <span className="text-zinc-100 font-mono tracking-wide whitespace-nowrap">
                {commands[activePkg]}
              </span>
              <span className="w-2 h-5 bg-emerald-400 animate-pulse select-none shrink-0" />
            </div>

            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500/40 transition-all cursor-pointer w-full sm:w-auto"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy command</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Output Simulation */}
          <div className="px-4 sm:px-5 py-2.5 bg-zinc-950/70 border-t border-zinc-900 text-left font-mono text-[11px] text-zinc-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <span>✨ Zero native C compilation required • Pure Python wheels ready</span>
            <span className="text-emerald-400">v1.2.4</span>
          </div>

        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onStartFree}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-emerald-400 hover:bg-emerald-300 text-zinc-950 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onOpenConsole}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium text-sm text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Try Live Simulator Console</span>
          </button>
        </div>

        {/* Security & SLA Badges */}
        <div className="mt-12 pt-8 border-t border-zinc-900/80 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SOC2 Type II Certified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>HIPAA BAA Eligible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>99.99% Ingestion Uptime SLA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>

      </div>

    </section>
  );
}
