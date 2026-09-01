import { Zap, Globe, Terminal } from 'lucide-react';

export default function Footer({ onOpenConsole }) {
  const footerLinks = {
    product: [
      { name: 'AI Diagnostic Engine', href: '#features' },
      { name: 'Real-time Telemetry', href: '#bento' },
      { name: 'Python SDK', href: '#code-preview' },
      { name: 'React ErrorBoundary', href: '#code-preview' },
      { name: 'FastAPI / Django', href: '#code-preview' },
      { name: 'Automated Fix PRs', href: '#bento' },
      { name: 'Interactive Console', href: '#', onClick: onOpenConsole },
    ],
    resources: [
      { name: 'Documentation', href: '#' },
      { name: 'API Reference', href: '#' },
      { name: 'Python Quickstart', href: '#' },
      { name: 'Django Middleware', href: '#' },
      { name: 'FastAPI Middleware', href: '#' },
      { name: 'Status Page', href: '#' },
    ],
    company: [
      { name: 'About AutoTrace', href: '#' },
      { name: 'Engineering Blog', href: '#' },
      { name: 'Architecture & Engine', href: '#bento' },
      { name: 'Careers (We’re hiring!)', href: '#' },
      { name: 'Security & Compliance', href: '#' },
      { name: 'Contact Sales', href: '#' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Security Whitepaper', href: '#' },
      { name: 'GDPR / DPA', href: '#' },
      { name: 'Subprocessors', href: '#' },
    ]
  };

  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* 4-Column Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
          
          {/* Col 1: Product */}
          <div>
            <h4 className="font-semibold text-white uppercase font-mono tracking-wider text-[11px] mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((item) => (
                <li key={item.name}>
                  {item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className="hover:text-emerald-400 transition-colors text-left cursor-pointer"
                    >
                      {item.name}
                    </button>
                  ) : (
                    <a href={item.href} className="hover:text-emerald-400 transition-colors">
                      {item.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Resources */}
          <div>
            <h4 className="font-semibold text-white uppercase font-mono tracking-wider text-[11px] mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="hover:text-emerald-400 transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Company */}
          <div>
            <h4 className="font-semibold text-white uppercase font-mono tracking-wider text-[11px] mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="hover:text-emerald-400 transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Legal */}
          <div>
            <h4 className="font-semibold text-white uppercase font-mono tracking-wider text-[11px] mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="hover:text-emerald-400 transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 border border-emerald-500/30 text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-zinc-500 font-mono">
              &copy; {new Date().getFullYear()} AutoTrace Inc. Built for developers.
            </span>
          </div>

          {/* System Status Badge */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300">All Systems Operational (99.99%)</span>
            </div>

            {/* Social / Developer Links */}
            <div className="flex items-center gap-3 text-zinc-400">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                <Terminal className="w-4 h-4" />
                <span className="text-[11px] font-mono">GitHub</span>
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                <Globe className="w-4 h-4" />
                <span className="text-[11px] font-mono">Docs</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </footer>
  );
}
