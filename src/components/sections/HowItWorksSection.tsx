import React from 'react';
import { PageContainer } from '../ui/PageContainer';
import { SectionHeading } from '../ui/SectionHeading';
import { HOW_IT_WORKS_STEPS } from '../../data/eventData';
import { ArrowRight } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32 bg-[#08080C] border-t border-[#1C1C2A]">
      <PageContainer size="normal">
        <SectionHeading
          badge="4-STEP EVENT FLOW"
          title="HOW IT WORKS"
          subtitle="From registration to the final spotlight reveal, the live event operates with real-time scoring precision."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative">
          {HOW_IT_WORKS_STEPS.map((step, idx) => (
            <div
              key={step.stepNumber}
              className="relative p-8 bg-[#0E0E16] border border-[#1E1E2C] hover:border-amber-400/50 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Big Step Number */}
                <div className="flex items-baseline justify-between mb-6">
                  <span className="text-5xl font-display font-black text-zinc-800 group-hover:text-amber-400/80 transition-colors">
                    {step.stepNumber}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                </div>

                <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider mb-2 group-hover:text-amber-400 transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs font-semibold text-amber-400/90 font-mono uppercase mb-4 tracking-wide">
                  {step.subtitle}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed font-sans">
                  {step.description}
                </p>
              </div>

              {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 rounded-full bg-[#141420] border border-[#2E2E44] flex items-center justify-center text-amber-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  );
};
