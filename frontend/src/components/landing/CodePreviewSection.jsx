import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, 
  Check, 
  Copy 
} from 'lucide-react';

export default function CodePreviewSection() {
  const [activeTab, setActiveTab] = useState('python');
  const [copied, setCopied] = useState(false);

  const snippets = {
    python: {
      lang: 'python',
      file: 'app.py',
      code: `import autotrace

# 1. Initialize AutoTrace with your project key
autotrace.init(
    api_key="at_live_984f89d3a71b2e8",
    environment="production",
    capture_unhandled=True,
    enable_ai_triage=True
)

# 2. Exceptions are automatically intercepted & diagnosed
def process_order(order_id: str, discount_rate: float):
    # AutoTrace captures local variables, stack frames & generates fix
    return total_price / discount_rate
`
    },
    fastapi: {
      lang: 'python',
      file: 'server.py',
      code: `from fastapi import FastAPI
import autotrace
from autotrace.integrations.fastapi import AutoTraceMiddleware

app = FastAPI(title="Payment Service")

# Intercept async exceptions and capture request telemetry
autotrace.init(api_key="at_live_984f89d3a71b2e8")
app.add_middleware(AutoTraceMiddleware)

@app.get("/checkout/{user_id}")
async def checkout(user_id: str):
    return {"status": "ok", "telemetry": "streaming"}
`
    },
    django: {
      lang: 'python',
      file: 'settings.py',
      code: `import autotrace

# Add to your Django settings.py
MIDDLEWARE = [
    'autotrace.middleware.AutoTraceDjangoMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # ...
]

AUTOTRACE_CONFIG = {
    'API_KEY': 'at_live_984f89d3a71b2e8',
    'ENVIRONMENT': 'production',
    'AUTO_GENERATE_PRS': True
}
`
    },
    react: {
      lang: 'jsx',
      file: 'App.jsx',
      code: `import React from 'react';
import { AutoTraceProvider, ErrorBoundary } from '@autotrace/react';

// Wrap your React component tree
export default function App() {
  return (
    <AutoTraceProvider apiKey="at_live_984f89d3a71b2e8">
      <ErrorBoundary fallback={<ErrorScreen />}>
        <CheckoutFlow />
      </ErrorBoundary>
    </AutoTraceProvider>
  );
}
`
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="code-preview" className="py-24 bg-zinc-950 relative border-t border-zinc-900 overflow-hidden">
      
      {/* Background Accent */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-emerald-500/10 blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Side-by-side grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Feature descriptions */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400">
              <Code2 className="w-3.5 h-3.5" />
              <span>Developer Experience First</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Two lines of code.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
                Zero headache.
              </span>
            </h2>

            <p className="text-zinc-400 text-base leading-relaxed">
              Integrate in seconds without changing how you write code. AutoTrace automatically instruments unhandled exceptions, network calls, async tasks, and user sessions.
            </p>

            {/* Checklist with Neon Accents */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Automatic Exception Trapping</h4>
                  <p className="text-xs text-zinc-400">Captures unhandled panics, async crashes, and background worker failures.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Context &amp; Breadcrumb Enrichment</h4>
                  <p className="text-xs text-zinc-400">Attaches local variable states, active SQL queries, and HTTP breadcrumbs.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Non-Blocking Daemon Queue</h4>
                  <p className="text-xs text-zinc-400">Buffered in background threads. Zero GIL lock or response latency hit.</p>
                </div>
              </div>
            </div>

            {/* Tab framework selector */}
            <div className="pt-2">
              <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider block mb-2">
                Supported Frameworks:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'python', label: 'Python SDK' },
                  { id: 'fastAPI', label: 'FastAPI' },
                  { id: 'django', label: 'Django' },
                  { id: 'react', label: 'React / Next.js' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id.toLowerCase())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      activeTab === item.id.toLowerCase()
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold'
                        : 'bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Code Editor Mockup */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl overflow-hidden glow-box-neon">
              
              {/* Window Header with Mac Dots */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/90 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-3 text-xs font-mono text-zinc-400">
                    {snippets[activeTab].file}
                  </span>
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-zinc-400 hover:text-emerald-400 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 transition-all cursor-pointer"
                  title="Copy snippet"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Code Content */}
              <div className="p-4 sm:p-6 bg-zinc-950/80 font-mono text-xs overflow-x-auto leading-relaxed">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        {snippets[activeTab].code.split('\n').map((line, idx) => {
                          const isComment = line.trim().startsWith('#') || line.trim().startsWith('//');
                          const isImport = line.includes('import ') || line.includes('from ');
                          const isKeyword = line.includes('def ') || line.includes('async ') || line.includes('return ') || line.includes('export ');

                          let colorClass = "text-zinc-300";
                          if (isComment) colorClass = "text-zinc-500 italic";
                          else if (line.includes('autotrace.init')) colorClass = "text-emerald-400 font-semibold";
                          else if (isImport) colorClass = "text-sky-300";
                          else if (isKeyword) colorClass = "text-purple-300";

                          return (
                            <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                              <td className="w-8 text-right pr-4 text-zinc-600 select-none text-[11px]">
                                {idx + 1}
                              </td>
                              <td className={`whitespace-pre font-mono ${colorClass}`}>
                                {line}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Window Footer Status */}
              <div className="px-4 py-2 bg-zinc-950/90 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  SDK Verified Compatibility: Python 3.9+ / Node 18+
                </span>
                <span>UTF-8</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
