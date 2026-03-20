import { HeroSection } from './HeroSection';
import { ProblemSection } from './ProblemSection';
import { HowItWorksSection } from './HowItWorksSection';
import { RoleCardsSection } from './RoleCardsSection';
import { PreviewCardsSection } from './PreviewCardsSection';
import { StatsStrip } from './StatsStrip';
import { LandingFooter } from './LandingFooter';

/**
 * Full-page marketing / product landing page.
 * Renders OUTSIDE the Layout shell — no nav, standalone route.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <RoleCardsSection />
      <PreviewCardsSection />
      <StatsStrip />
      <LandingFooter />
    </div>
  );
}
