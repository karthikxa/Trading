import React from 'react';
import { cn } from '@kortix/ui';

export interface KortixPinIconProps extends React.SVGProps<SVGSVGElement> {
  filled?: boolean;
}

export const KortixPinIcon = ({
  className,
  filled = false,
  ...props
}: KortixPinIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="#FFFFFF"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('inline-block -rotate-45 transition-transform', className)}
      {...props}
    >
      <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth={2.4} />
      <path
        d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1v3.76a2 2 0 0 1-.89 1.66l-1.78.9A2 2 0 0 0 5 15.24Z"
        fill="#FFFFFF"
        stroke="currentColor"
        strokeWidth={2.4}
      />
    </svg>
  );
};

export default KortixPinIcon;
