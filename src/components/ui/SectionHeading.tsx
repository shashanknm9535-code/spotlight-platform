import React from 'react';
import { Badge } from './Badge';

export interface SectionHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  lightText?: boolean;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  badge,
  title,
  subtitle,
  align = 'center',
}) => {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';

  return (
    <div className={`max-w-3xl mb-12 md:mb-16 ${alignClass}`}>
      {badge && (
        <div className="mb-4">
          <Badge variant="gold">{badge}</Badge>
        </div>
      )}
      <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white uppercase leading-[1.08] mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base sm:text-lg text-zinc-400 font-sans leading-relaxed max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      <div className={`mt-6 h-0.5 w-12 bg-amber-400/80 ${align === 'center' ? 'mx-auto' : ''}`} />
    </div>
  );
};
