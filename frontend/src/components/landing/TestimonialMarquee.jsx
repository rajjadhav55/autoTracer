import { MessageSquareQuote, Star, CheckCircle2 } from 'lucide-react';

export default function TestimonialMarquee() {
  const testimonials = [
    {
      name: 'Alex Rivera',
      role: 'Staff Infrastructure Engineer',
      company: 'ScaleGrid Cloud',
      avatar: 'AR',
      highlight: 'Cut MTTR by 78%',
      quote: 'AutoTrace replaced three disparate monitoring tools for us. The AI triage is frighteningly accurate—it points directly to the line of code that triggered the regression.'
    },
    {
      name: 'Elena Rostova',
      role: 'Lead Backend Architect',
      company: 'Veloce Payments',
      avatar: 'ER',
      highlight: 'Zero GIL Overhead',
      quote: 'We were skeptical of runtime telemetry overhead in Python, but AutoTrace clocks in under 1.5ms on our p99. It captured a silent database pool leak on day one.'
    },
    {
      name: 'Marcus Chen',
      role: 'Head of Engineering',
      company: 'HyperFlow AI',
      avatar: 'MC',
      highlight: '1-Click Fix PRs',
      quote: 'The automated GitHub PR generation is pure magic. When a FastAPI endpoint threw an unhandled validation exception, AutoTrace had a patch ready before our on-call got paged.'
    },
    {
      name: 'Sarah Jenkins',
      role: 'Principal Fullstack Lead',
      company: 'OmniCommerce',
      avatar: 'SJ',
      highlight: 'React & Django Trace Sync',
      quote: 'Connecting React client-side uncaught errors directly to Django backend trace IDs saved our team countless hours of frustrating debugging.'
    },
    {
      name: 'David Okafor',
      role: 'VP of Platform',
      company: 'Aether Security',
      avatar: 'DO',
      highlight: 'SOC2 Compliant PII Masking',
      quote: 'The built-in client-side data sanitization made compliance approval effortless. Sensitive tokens and customer PII never leave our infrastructure unmasked.'
    },
    {
      name: 'Liam Vance',
      role: 'Site Reliability Lead',
      company: 'KubeScale Systems',
      avatar: 'LV',
      highlight: 'Noise Filtered by 99%',
      quote: 'Alert fatigue used to burn out our on-call rotation. AutoTrace collapsed 40,000 cascading log entries into a single actionable incident card.'
    }
  ];

  // Duplicate list to create a seamless infinite scrolling marquee loop
  const marqueeItems = [...testimonials, ...testimonials];

  return (
    <section id="testimonials" className="py-24 bg-zinc-950 relative border-t border-zinc-900 overflow-hidden">
      
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/5 blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center space-y-4">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400">
          <MessageSquareQuote className="w-3.5 h-3.5" />
          <span>Wall of Love</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Loved by engineers who{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
            ship without fear.
          </span>
        </h2>

        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto">
          See why modern engineering teams rely on AutoTrace for real-time telemetry and zero-guesswork debugging.
        </p>

      </div>

      {/* Marquee Track Container with Gradient Edge Fades */}
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        
        <div className="animate-marquee flex gap-6 py-4">
          {marqueeItems.map((item, idx) => (
            <div
              key={idx}
              className="w-[360px] sm:w-[400px] shrink-0 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all duration-200 shadow-lg flex flex-col justify-between"
            >
              <div>
                {/* Header with Avatar and Highlight */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs text-emerald-400 shadow-inner">
                      {item.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white">{item.name}</h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <p className="text-xs text-zinc-400">{item.role}</p>
                    </div>
                  </div>
                </div>

                <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                  {item.highlight}
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic">
                  "{item.quote}"
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>{item.company}</span>
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

    </section>
  );
}
