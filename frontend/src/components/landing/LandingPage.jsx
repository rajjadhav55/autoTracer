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
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
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
