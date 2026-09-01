import { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  Moon, 
  Menu, 
  X,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ onOpenConsole, onOpenAuth, userProfile, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-850/80 shadow-2xl shadow-black/60 py-3.5' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700/80 group-hover:border-emerald-400/80 transition-all duration-300">
                <div className="w-4 h-4 rounded-full border border-emerald-400/80 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                AutoTrace
              </span>
            </a>

            {/* Center Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-zinc-300">
              <div className="relative">
                <button
                  onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
                  onMouseEnter={() => setFeaturesDropdownOpen(true)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                >
                  <span>Features</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {featuresDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      onMouseLeave={() => setFeaturesDropdownOpen(false)}
                      className="absolute top-full left-0 mt-2 w-56 rounded-xl bg-zinc-900/95 border border-zinc-800 p-2 shadow-2xl backdrop-blur-xl font-sans"
                    >
                      <a 
                        href="#features" 
                        onClick={() => setFeaturesDropdownOpen(false)}
                        className="block px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 text-zinc-200 hover:text-white"
                      >
                        <div className="font-semibold text-emerald-400">AI Error Triage</div>
                        <div className="text-[11px] text-zinc-400">Automated root cause synthesis</div>
                      </a>
                      <a 
                        href="#bento" 
                        onClick={() => setFeaturesDropdownOpen(false)}
                        className="block px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 text-zinc-200 hover:text-white"
                      >
                        <div className="font-semibold text-emerald-400">Real-time Telemetry</div>
                        <div className="text-[11px] text-zinc-400">Sub-2ms ingestion pipeline</div>
                      </a>
                      <a 
                        href="#code-preview" 
                        onClick={() => setFeaturesDropdownOpen(false)}
                        className="block px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 text-zinc-200 hover:text-white"
                      >
                        <div className="font-semibold text-emerald-400">SDK Setup</div>
                        <div className="text-[11px] text-zinc-400">Python, FastAPI, Django & React</div>
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <a href="#bento" className="hover:text-white transition-colors">Architecture</a>
              <a href="#code-preview" className="hover:text-white transition-colors">Docs</a>
              <a href="#terminal-cta" className="hover:text-white transition-colors">SDKs</a>
              <a href="#terminal-cta" className="hover:text-white transition-colors">Download</a>
            </nav>
          </div>

          {/* Right Controls */}
          <div className="hidden sm:flex items-center gap-5">
            {/* Theme Toggle Icon */}
            <div className="text-emerald-400/90 hover:text-emerald-300 transition-colors cursor-pointer p-1">
              <Moon className="w-4 h-4" />
            </div>

            {userProfile ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenConsole}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Dashboard ({userProfile.username})</span>
                </button>
                <button
                  onClick={onLogout}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  Sign in
                </button>

                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-white hover:bg-zinc-100 text-zinc-950 transition-all duration-200 shadow-md hover:scale-105 cursor-pointer"
                >
                  Get started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => (userProfile ? onOpenConsole() : onOpenAuth('register'))}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-zinc-950 cursor-pointer"
            >
              {userProfile ? 'Dashboard' : 'Get started'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden bg-zinc-950/95 border-b border-zinc-800 px-4 pt-3 pb-6 space-y-3 backdrop-blur-xl"
          >
            <div className="flex flex-col space-y-2 text-sm text-zinc-300">
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-white"
              >
                Features
              </a>
              <a 
                href="#bento" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-white"
              >
                Pricing
              </a>
              <a 
                href="#code-preview" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-white"
              >
                Docs
              </a>
              <a 
                href="#terminal-cta" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-white"
              >
                SDKs
              </a>
              <a 
                href="#terminal-cta" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-white"
              >
                Download
              </a>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenConsole();
                }}
                className="w-full py-2 px-3 rounded-full text-xs font-medium text-center bg-zinc-900 border border-zinc-700 text-emerald-400"
              >
                Live Console
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="w-full py-2 px-3 rounded-full text-xs font-medium text-center bg-zinc-800 text-zinc-200"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
