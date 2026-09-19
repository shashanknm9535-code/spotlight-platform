import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'normal' | 'wide' | 'narrow';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  size = 'normal',
}) => {
  const sizeClasses = {
    narrow: 'max-w-4xl',
    normal: 'max-w-7xl',
    wide: 'max-w-[1440px]',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'w-full mx-auto px-4 sm:px-6 lg:px-8',
          sizeClasses[size],
          className
        )
      )}
    >
      {children}
    </div>
  );
};
