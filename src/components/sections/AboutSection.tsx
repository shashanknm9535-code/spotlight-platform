import React from 'react';
import { PageContainer } from '../ui/PageContainer';
import { SectionHeading } from '../ui/SectionHeading';
import { FeatureCard } from '../ui/FeatureCard';
import { PARTICIPANTS_DATA } from '../../data/eventData';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="relative py-24 md:py-32 bg-[#09090E] overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 blur-[120px] pointer-events-none" />

      <PageContainer size="normal">
        <SectionHeading
          badge="WHAT IS SPOTLIGHT?"
          title="More than a performance."
          subtitle="Spotlight unites performers, judges, audience members, and organizers into a single real-time arena. Every vote, score, and beat aligns under the spotlight."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {PARTICIPANTS_DATA.map((participant) => (
            <FeatureCard key={participant.id} participant={participant} />
          ))}
        </div>
      </PageContainer>
    </section>
  );
};
