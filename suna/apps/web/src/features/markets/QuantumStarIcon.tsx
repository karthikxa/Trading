import React from 'react';
import { cn } from '@kortix/ui';

interface QuantumStarIconProps {
  className?: string;
  size?: number;
  glow?: boolean;
  filled?: boolean;
}

/**
 * 4-Pointed Celestial Diamond Star (Quantum Sparkle)
 * Matches the user-provided design reference (media_1795193948403_38208a6b.png).
 * Hypocycloid / astroid 4-pointed sparkle curve.
 */
export default function QuantumStarIcon({
  className = '',
  size = 20,
  glow = false,
  filled = false,
}: QuantumStarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'transition-all duration-300',
        glow && 'drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] text-indigo-500 dark:text-indigo-400',
        className
      )}
    >
      {/* 4-pointed astroid diamond sparkle curve */}
      <path
        d="M 12 2 Q 12 12 2 12 Q 12 12 12 22 Q 12 12 22 12 Q 12 12 12 2 Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {filled && (
        <circle cx="12" cy="12" r="1.5" fill="white" className="opacity-90" />
      )}
    </svg>
  );
}
