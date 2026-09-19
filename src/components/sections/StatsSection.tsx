import React from 'react';
import { PageContainer } from '../ui/PageContainer';
import { StatCard } from '../ui/StatCard';
import { EVENT_STATS } from '../../data/eventData';

export const StatsSection: React.FC = () => {
  return (
    <section id="stats" className="relative py-16 bg-[#08080C] border-y border-[#1C1C2A]">
      <PageContainer size="normal">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {EVENT_STATS.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
      </PageContainer>
    </section>
  );
};
