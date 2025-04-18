import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarLogo({ 
  className,
  size = 'md',
  ...props
}: AvatarLogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn(
      'rounded-full bg-[#FFBA08] flex items-center justify-center', 
      sizes[size],
      className
    )} {...props}>
      <svg 
        className={cn(
          'w-3/5 h-3/5', 
          'text-white'
        )}
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <circle cx="50" cy="50" r="50" fill="#FFBA08"/>
          <path d="M60 30C60 35.5228 55.5228 40 50 40C44.4772 40 40 35.5228 40 30C40 24.4772 44.4772 20 50 20C55.5228 20 60 24.4772 60 30Z" fill="#5A0001"/>
          <path d="M70 65L58 48C55 45 45 45 42 48L30 65L36 70H64L70 65Z" fill="#2ABDC0"/>
          <rect x="43" y="38" width="14" height="35" fill="#2ABDC0"/>
          <path d="M28 68C28 68 33 78 50 78C67 78 72 68 72 68" stroke="#5A0001" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="50" cy="30" r="10" stroke="#2ABDC0" strokeWidth="2"/>
          <circle cx="50" cy="30" r="5" fill="#FF0066"/>
        </g>
      </svg>
    </div>
  );
}

export default AvatarLogo;
