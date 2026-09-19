import React from 'react';
import { HeroSection } from '../components/sections/HeroSection';
import { StatsSection } from '../components/sections/StatsSection';
import { AboutSection } from '../components/sections/AboutSection';
import { HowItWorksSection } from '../components/sections/HowItWorksSection';
import { ScoringSection } from '../components/sections/ScoringSection';
import { TracksSection } from '../components/sections/TracksSection';
import { CTASection } from '../components/ui/CTASection';

export const HomePage: React.FC = () => {
  return (
    <main className="w-full">
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <HowItWorksSection />
      <ScoringSection />
      <TracksSection />
      <CTASection />
    </main>
  );
};
