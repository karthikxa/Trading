'use client';

import React, { useEffect, useRef, useState } from 'react';

export type BotShape =
  | 'circle'
  | 'pebble'
  | 'squircle'
  | 'capsule'
  | 'triangle'
  | 'hexagon'
  | 'cloud'
  | 'droplet';

export type BotExpression =
  | 'neutral'
  | 'attentive'
  | 'surprised'
  | 'excited'
  | 'happy'
  | 'laughing'
  | 'angry'
  | 'sad'
  | 'scared'
  | 'suspicious'
  | 'confused'
  | 'curious'
  | 'proud'
  | 'shy'
  | 'unimpressed'
  | 'sleepy';

export interface BotAvatarProps {
  shape?: BotShape;
  color?: string;
  expression?: BotExpression;
  size?: number;
  className?: string;
  isAnimated?: boolean;
  isSpeaking?: boolean;
}

export function BotAvatar({
  shape = 'circle',
  color = '#2563EB',
  expression = 'attentive',
  size = 28,
  className = '',
  isAnimated = true,
  isSpeaking = false,
}: BotAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  // Shape-specific bounds and vertical offsets to keep eyes perfectly centered and inside the silhouette
  const shapeOffsets: Record<BotShape, { offsetY: number; maxGaze: number }> = {
    circle: { offsetY: 0, maxGaze: 7.5 },
    squircle: { offsetY: 0, maxGaze: 7.5 },
    capsule: { offsetY: 0, maxGaze: 6.5 },
    triangle: { offsetY: 16, maxGaze: 3.2 }, // Lower eyes comfortably into wide belly of triangle
    hexagon: { offsetY: 0, maxGaze: 6.5 },
    cloud: { offsetY: 3, maxGaze: 6 },
    pebble: { offsetY: 0, maxGaze: 6.5 },
    droplet: { offsetY: 8, maxGaze: 5.5 },
  };

  const currentShapeOffset = shapeOffsets[shape] || { offsetY: 0, maxGaze: 7 };

  // 360-degree continuous circular gaze tracking with angle & distance
  useEffect(() => {
    if (!isAnimated) return;

    let rafId: number | null = null;
    let cachedRect: DOMRect | null = null;

    const onScrollOrResize = () => {
      cachedRect = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!cachedRect && containerRef.current) {
          cachedRect = containerRef.current.getBoundingClientRect();
        }
        if (!cachedRect) return;
        const centerX = cachedRect.left + cachedRect.width / 2;
        const centerY = cachedRect.top + cachedRect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;

        // Continuous 360 degree polar rotation
        const angle = Math.atan2(dy, dx);
        const maxDist = currentShapeOffset.maxGaze;
        const r = Math.min(distance / 70, 1) * maxDist;

        setGaze({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * (r * 0.85),
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isAnimated, currentShapeOffset.maxGaze]);

  // Natural periodic blinking loop
  useEffect(() => {
    if (!isAnimated) return;

    let blinkTimeout: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      const delay = 2500 + Math.random() * 3000; // blink every 2.5s - 5.5s
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150); // 150ms blink duration
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(blinkTimeout);
  }, [isAnimated]);

  const renderShape = () => {
    const strokeProps = {
      stroke: 'rgba(0, 0, 0, 0.08)',
      strokeWidth: '1.5',
    };
    switch (shape) {
      case 'circle':
        return <circle cx="50" cy="50" r="47.5" fill={color} {...strokeProps} />;
      case 'squircle':
        return <rect x="4" y="4" width="92" height="92" rx="28" fill={color} {...strokeProps} />;
      case 'capsule':
        return <rect x="4" y="16" width="92" height="68" rx="34" fill={color} {...strokeProps} />;
      case 'droplet':
        return (
          <path
            d="M 50 4 C 50 4, 94 54, 94 72 A 44 44 0 1 1 6 72 C 6 54, 50 4, 50 4 Z"
            fill={color}
            {...strokeProps}
          />
        );
      case 'triangle':
        return (
          <path
            d="M 50 6 C 56 6, 62 14, 92 70 C 98 82, 90 94, 76 94 L 24 94 C 10 94, 2 82, 8 70 Z"
            fill={color}
            {...strokeProps}
          />
        );
      case 'hexagon':
        return (
          <path
            d="M 46 7 C 48.5 5.5, 51.5 5.5, 54 7 L 86 25 C 88.5 26.5, 90 29.5, 90 32.5 L 90 67.5 C 90 70.5, 88.5 73.5, 86 75 L 54 93 C 51.5 94.5, 48.5 94.5, 46 93 L 14 75 C 11.5 73.5, 10 70.5, 10 67.5 L 10 32.5 C 10 29.5, 11.5 26.5, 14 25 Z"
            fill={color}
            {...strokeProps}
          />
        );
      case 'cloud':
        return (
          <path
            d="M 32 30 A 22 22 0 0 1 68 28 A 24 24 0 0 1 94 54 A 22 22 0 0 1 76 88 L 24 88 A 22 22 0 0 1 6 56 A 22 22 0 0 1 32 30 Z"
            fill={color}
            {...strokeProps}
          />
        );
      case 'pebble':
        return (
          <path
            d="M 30 10 C 65 4, 98 16, 94 52 C 90 88, 58 98, 26 88 C 2 78, 2 18, 30 10 Z"
            fill={color}
            {...strokeProps}
          />
        );
      default:
        return <circle cx="50" cy="50" r="47.5" fill={color} {...strokeProps} />;
    }
  };

  const renderEyes = () => {
    if (isBlinking) {
      return (
        <g stroke="white" strokeWidth="4" strokeLinecap="round">
          <line x1="34" y1="48" x2="48" y2="48" />
          <line x1="52" y1="48" x2="66" y2="48" />
        </g>
      );
    }

    switch (expression) {
      case 'neutral':
        return (
          <g fill="white">
            <rect x="36" y="38" width="8.5" height="19" rx="4.25" />
            <rect x="56" y="38" width="8.5" height="19" rx="4.25" />
          </g>
        );
      case 'attentive':
        return (
          <g fill="white">
            <rect x="36" y="38" width="8.5" height="19" rx="4.25" transform="rotate(-15 40 48)" />
            <rect x="56" y="38" width="8.5" height="19" rx="4.25" transform="rotate(-15 60 48)" />
          </g>
        );
      case 'surprised':
        return (
          <g fill="white">
            <circle cx="40" cy="46" r="7.5" />
            <circle cx="60" cy="46" r="7.5" />
          </g>
        );
      case 'excited':
        return (
          <g fill="white">
            <rect x="36" y="38" width="8.5" height="19" rx="4.25" transform="rotate(15 40 46)" />
            <rect x="56" y="38" width="8.5" height="19" rx="4.25" transform="rotate(-15 60 46)" />
          </g>
        );
      case 'happy':
        return (
          <g stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d="M 34 50 C 34 40, 46 40, 46 50" />
            <path d="M 54 50 C 54 40, 66 40, 66 50" />
          </g>
        );
      case 'laughing':
        return (
          <g stroke="white" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M 34 48 Q 40 40 46 48" />
            <path d="M 54 48 Q 60 40 66 48" />
          </g>
        );
      case 'angry':
        return (
          <g fill="white">
            <rect x="36" y="38" width="8.5" height="19" rx="4.25" transform="rotate(22 40 46)" />
            <rect x="56" y="38" width="8.5" height="19" rx="4.25" transform="rotate(-22 60 46)" />
          </g>
        );
      case 'sad':
        return (
          <g fill="white">
            <rect x="36" y="38" width="8.5" height="19" rx="4.25" transform="rotate(-22 40 48)" />
            <rect x="56" y="38" width="8.5" height="19" rx="4.25" transform="rotate(22 60 48)" />
          </g>
        );
      case 'scared':
        return (
          <g fill="white">
            <circle cx="40" cy="47" r="4.5" />
            <circle cx="60" cy="47" r="4.5" />
          </g>
        );
      case 'suspicious':
        return (
          <g fill="white">
            <rect x="34" y="45" width="13" height="5" rx="2.5" />
            <rect x="53" y="45" width="13" height="5" rx="2.5" />
          </g>
        );
      case 'confused':
        return (
          <g fill="white">
            <rect x="36" y="34" width="8.5" height="19" rx="4.25" transform="rotate(-15 40 44)" />
            <rect x="56" y="44" width="8.5" height="15" rx="4.25" />
          </g>
        );
      case 'curious':
        return (
          <g fill="white">
            <rect x="36" y="34" width="8.5" height="19" rx="4.25" transform="rotate(-10 40 44)" />
            <rect x="56" y="43" width="8.5" height="17" rx="4.25" />
          </g>
        );
      case 'proud':
        return (
          <g fill="white">
            <rect x="36" y="39" width="8.5" height="18" rx="4.25" transform="rotate(-12 40 47)" />
            <rect x="56" y="39" width="8.5" height="18" rx="4.25" transform="rotate(-12 60 47)" />
          </g>
        );
      case 'shy':
        return (
          <g>
            <rect x="36" y="44" width="7.5" height="15" rx="3.75" fill="white" />
            <rect x="56" y="44" width="7.5" height="15" rx="3.75" fill="white" />
            <circle cx="28" cy="56" r="3" fill="#FDA4AF" opacity="0.8" />
            <circle cx="72" cy="56" r="3" fill="#FDA4AF" opacity="0.8" />
          </g>
        );
      case 'unimpressed':
        return (
          <g fill="white">
            <rect x="34" y="44" width="13" height="6" rx="3" />
            <rect x="53" y="44" width="13" height="6" rx="3" />
          </g>
        );
      case 'sleepy':
        return (
          <g stroke="white" strokeWidth="4.5" strokeLinecap="round">
            <line x1="33" y1="48" x2="47" y2="48" />
            <line x1="53" y1="48" x2="67" y2="48" />
          </g>
        );
      default:
        return (
          <g fill="white">
            <rect x="36" y="38" width="8.5" height="19" rx="4.25" transform="rotate(-15 40 48)" />
            <rect x="56" y="38" width="8.5" height="19" rx="4.25" transform="rotate(-15 60 48)" />
          </g>
        );
    }
  };

  const clipId = React.useId().replace(/:/g, '');

  return (
    <div
      ref={containerRef}
      className={`relative shrink-0 flex items-center justify-center select-none overflow-visible transition-transform ${isSpeaking ? 'animate-pulse scale-105' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        className="overflow-visible drop-shadow-2xs"
      >
        <defs>
          <clipPath id={clipId}>
            {renderShape()}
          </clipPath>
        </defs>

        {/* Base Geometric Shape */}
        {renderShape()}

        {/* Eyes Group with Smooth 360-Degree Cursor Gaze Tracking & Shape Centering */}
        <g clipPath={`url(#${clipId})`}>
          <g transform={`translate(0, ${currentShapeOffset.offsetY})`}>
            <g
              style={{
                transform: `translate3d(${gaze.x}px, ${gaze.y}px, 0)`,
                transition: 'transform 0.02s linear',
              }}
            >
              {renderEyes()}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
