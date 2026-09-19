import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  isExternal?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  href,
  isExternal,
  children,
  icon,
  fullWidth = false,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#08080C] disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-sm uppercase';

  const variants = {
    primary: 'bg-amber-400 text-black hover:bg-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.35)] hover:shadow-[0_0_35px_rgba(250,204,21,0.55)] hover:-translate-y-0.5 active:translate-y-0 border border-yellow-300',
    secondary: 'bg-[#141420] text-white hover:bg-[#1E1E30] border border-[#2E2E44] hover:border-amber-400/40 hover:-translate-y-0.5 active:translate-y-0',
    outline: 'bg-transparent text-amber-400 hover:text-yellow-300 border border-amber-400/60 hover:border-amber-400 hover:bg-amber-400/10',
    ghost: 'bg-transparent text-zinc-300 hover:text-white hover:bg-white/5',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-2 space-x-1.5',
    md: 'text-sm px-5 py-2.5 space-x-2',
    lg: 'text-base px-7 py-3.5 space-x-2.5 font-bold',
  };

  const classes = twMerge(
    clsx(
      baseStyles,
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    )
  );

  const content = (
    <>
      <span>{children}</span>
      {icon && <span className="shrink-0">{icon}</span>}
    </>
  );

  if (href) {
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
        >
          {content}
        </a>
      );
    }
    return (
      <Link to={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {content}
    </button>
  );
};
