import React from 'react';
import { PageContainer } from '../ui/PageContainer';
import { SectionHeading } from '../ui/SectionHeading';
import { TrackCard } from '../ui/TrackCard';
import { TRACKS_DATA } from '../../data/eventData';

export const TracksSection: React.FC = () => {
  return (
    <section id="tracks" className="relative py-24 md:py-32 bg-[#08080C] border-t border-[#1C1C2A]">
      <PageContainer size="normal">
        <SectionHeading
          badge="COMPETITION CATEGORIES"
          title="CHOOSE YOUR TRACK"
          subtitle="Whether you take the spotlight as a solo powerhouse or synchronize an ensemble act, select your category below."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {TRACKS_DATA.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </PageContainer>
    </section>
  );
};
