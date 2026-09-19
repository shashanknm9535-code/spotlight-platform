import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'dark' | 'outline' | 'live';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gold',
  className,
  icon,
}) => {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold tracking-wider uppercase border transition-all duration-200';
  
  const variants = {
    gold: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
    dark: 'bg-[#12121B] text-zinc-300 border-[#27273A]',
    outline: 'bg-transparent text-zinc-400 border-zinc-800',
    live: 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse',
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], className))}>
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
      )}
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
};
