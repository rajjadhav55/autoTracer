import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import BentoGrid from './BentoGrid';
import CoreFeaturesGrid from './CoreFeaturesGrid';
import CodePreviewSection from './CodePreviewSection';
import TestimonialMarquee from './TestimonialMarquee';
import TerminalCTA from './TerminalCTA';
import Footer from './Footer';

export default function LandingPage({
  onOpenConsole,
  onOpenAuth,
  userProfile,
  onLogout
}) {
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.5,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    // Intercept in-page hash links for buttery smooth scroll
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (anchor) {
        const targetId = anchor.getAttribute('href')?.slice(1);
        if (targetId) {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            e.preventDefault();
            lenis.scrollTo(targetEl, { offset: -70, duration: 1.2 });
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(el, { offset: -70, duration: 1.2 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {/* 1. Glass Navbar */}
      <Navbar
        onOpenConsole={onOpenConsole}
        onOpenAuth={onOpenAuth}
        userProfile={userProfile}
        onLogout={onLogout}
      />

      {/* 2. Hero Section with Relay-Style Animated Background Canvas & Floating Mockup */}
      <main className="flex-grow relative z-10">
        <HeroSection
          onStartFree={() => (userProfile ? onOpenConsole() : onOpenAuth('register'))}
          onReadDocs={() => scrollToSection('code-preview')}
          onLaunchDashboard={onOpenConsole}
        />

        {/* 3. Bento Grid Features */}
        <BentoGrid />

        {/* 4. Core Features Grid */}
        <CoreFeaturesGrid />

        {/* 5. Code Preview Side-by-Side Section */}
        <CodePreviewSection />

        {/* 6. Testimonial Marquee */}
        <TestimonialMarquee />

        {/* 7. Terminal CTA Box */}
        <TerminalCTA
          onStartFree={() => (userProfile ? onOpenConsole() : onOpenAuth('register'))}
          onOpenConsole={onOpenConsole}
        />
      </main>

      {/* 8. 4-Column Footer */}
      <Footer onOpenConsole={onOpenConsole} />
    </div>
  );
}
