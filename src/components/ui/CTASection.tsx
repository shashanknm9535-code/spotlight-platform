import React from 'react';
import { PageContainer } from './PageContainer';
import { Button } from './Button';
import { Badge } from './Badge';
import { ArrowRight, Ticket, Sparkles } from 'lucide-react';

export const CTASection: React.FC = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#08080C] border-t border-[#1C1C2A]">
      {/* Background Stage Lighting / Ambient Radial Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-400/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      </div>

      <PageContainer size="normal" className="relative z-10 text-center">
        <div className="inline-block mb-6">
          <Badge variant="gold" icon={<Sparkles className="w-3.5 h-3.5" />}>
            LIVE EVENT 2026
          </Badge>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-white uppercase tracking-tight leading-[1.05] max-w-4xl mx-auto mb-6">
          READY FOR THE <span className="text-amber-400 spotlight-text-glow">SPOTLIGHT?</span>
        </h2>

        <p className="text-base sm:text-lg md:text-xl text-zinc-300 font-sans max-w-2xl mx-auto mb-10 leading-relaxed">
          Whether you’re stepping onto the stage or powering the votes from the crowd, your moment starts now.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 max-w-md mx-auto">
          <Button
            href="/register"
            variant="primary"
            size="lg"
            fullWidth
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Register as Performer
          </Button>
          <Button
            href="/ticket"
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Ticket className="w-5 h-5 text-amber-400" />}
          >
            Get Your ₹10 Ticket
          </Button>
        </div>

        <div className="mt-12 text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Audience Rating Powered Real-Time • ₹10 Ticket • 800 Seats
        </div>
      </PageContainer>
    </section>
  );
};
