import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = 'rectangular',
  width,
  height 
}) => {
  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      style={style}
      className={cn(
        'animate-pulse bg-gray-200',
        {
          'rounded-md': variant === 'text' || variant === 'rectangular',
          'rounded-full': variant === 'circular',
          'h-4 w-full mb-2': variant === 'text' && !height,
        },
        className
      )}
    />
  );
};
