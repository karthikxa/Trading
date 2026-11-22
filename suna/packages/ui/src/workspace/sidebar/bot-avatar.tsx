'use client';

import React, { useEffect, useRef, useState } from 'react';

export type BotShape =
  | 'circle'
  | 'pebble'
  | 'squircle'
  | 'square'
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

function BotAvatarInner({
  shape = 'circle',
  color = '#2563EB',
  expression = 'attentive',
  size = 28,
  className = '',
  isAnimated = true,
  isSpeaking = false,
}: BotAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eyesGazeRef = useRef<SVGGElement>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  // Shape-specific bounds and vertical offsets to keep eyes perfectly centered and inside the silhouette
  const shapeOffsets: Record<BotShape, { offsetY: number; maxGaze: number; span: number }> = {
    circle: { offsetY: 0, maxGaze: 4.5, span: 1.0 },
    squircle: { offsetY: 0, maxGaze: 4.5, span: 1.0 },
    square: { offsetY: 0, maxGaze: 4.5, span: 1.0 },
    capsule: { offsetY: 0, maxGaze: 3.5, span: 0.95 },
    triangle: { offsetY: 18, maxGaze: 2.0, span: 0.78 }, // Low into wide base of triangle
    hexagon: { offsetY: 0, maxGaze: 3.5, span: 0.95 },
    cloud: { offsetY: 3, maxGaze: 2.2, span: 0.82 },     // Centered in main cloud puff
    pebble: { offsetY: 0, maxGaze: 3.0, span: 0.90 },
    droplet: { offsetY: 14, maxGaze: 2.2, span: 0.82 },   // Centered in round belly
  };

  const currentShapeOffset = shapeOffsets[shape] || { offsetY: 0, maxGaze: 4, span: 1.0 };

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
        if (!containerRef.current || !eyesGazeRef.current) return;
        if (!cachedRect) {
          cachedRect = containerRef.current.getBoundingClientRect();
        }
        if (!cachedRect || cachedRect.width === 0) return;

        const centerX = cachedRect.left + cachedRect.width / 2;
        const centerY = cachedRect.top + cachedRect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) {
          eyesGazeRef.current.style.transform = `translate3d(0px, 0px, 0)`;
          return;
        }

        const angle = Math.atan2(dy, dx);
        const maxDist = currentShapeOffset.maxGaze;
        const r = Math.min(distance / 70, 1) * maxDist;

        const gx = Math.cos(angle) * r;
        const gy = Math.sin(angle) * (r * 0.85);

        eyesGazeRef.current.style.transform = `translate3d(${gx.toFixed(2)}px, ${gy.toFixed(2)}px, 0)`;
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
      const delay = 3500 + Math.random() * 4000; // blink every 3.5s - 7.5s
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150);
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
      case 'square':
        return <rect x="5" y="5" width="90" height="90" rx="22" fill={color} {...strokeProps} />;
      case 'capsule':
        return <rect x="4" y="16" width="92" height="68" rx="34" fill={color} {...strokeProps} />;
      case 'droplet':
        return (
          <path
            d="M 50 10 C 50 10, 84 46, 84 64 A 34 34 0 1 1 16 64 C 16 46, 50 10, 50 10 Z"
            fill={color}
            {...strokeProps}
          />
        );
      case 'triangle':
        return (
          <path
            d="M 50 8 C 55 8, 60 14, 90 74 C 95 84, 88 94, 76 94 L 24 94 C 12 94, 5 84, 10 74 Z"
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
    const span = currentShapeOffset.span;
    const lx = 50 - 10 * span;
    const rx = 50 + 10 * span;

    if (isBlinking) {
      return (
        <g stroke="white" strokeWidth="4" strokeLinecap="round">
          <line x1={lx - 7} y1="48" x2={lx + 7} y2="48" />
          <line x1={rx - 7} y1="48" x2={rx + 7} y2="48" />
        </g>
      );
    }
    switch (expression) {
      case 'neutral':
        return (
          <g fill="white">
            <rect x={lx - 4.25} y="38" width="8.5" height="19" rx="4.25" />
            <rect x={rx - 4.25} y="38" width="8.5" height="19" rx="4.25" />
          </g>
        );
      case 'attentive':
        return (
          <g fill="white">
            <rect x={lx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(-15 ${lx} 48)`} />
            <rect x={rx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(-15 ${rx} 48)`} />
          </g>
        );
      case 'surprised':
        return (
          <g fill="white">
            <circle cx={lx} cy="46" r="7" />
            <circle cx={rx} cy="46" r="7" />
          </g>
        );
      case 'excited':
        return (
          <g fill="white">
            <rect x={lx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(15 ${lx} 46)`} />
            <rect x={rx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(-15 ${rx} 46)`} />
          </g>
        );
      case 'happy':
        return (
          <g stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d={`M ${lx - 6} 50 C ${lx - 6} 40, ${lx + 6} 40, ${lx + 6} 50`} />
            <path d={`M ${rx - 6} 50 C ${rx - 6} 40, ${rx + 6} 40, ${rx + 6} 50`} />
          </g>
        );
      case 'laughing':
        return (
          <g stroke="white" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d={`M ${lx - 6} 48 Q ${lx} 40 ${lx + 6} 48`} />
            <path d={`M ${rx - 6} 48 Q ${rx} 40 ${rx + 6} 48`} />
          </g>
        );
      case 'angry':
        return (
          <g fill="white">
            <rect x={lx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(22 ${lx} 46)`} />
            <rect x={rx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(-22 ${rx} 46)`} />
          </g>
        );
      case 'sad':
        return (
          <g fill="white">
            <rect x={lx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(-22 ${lx} 48)`} />
            <rect x={rx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(22 ${rx} 48)`} />
          </g>
        );
      case 'scared':
        return (
          <g fill="white">
            <circle cx={lx} cy="47" r="4.5" />
            <circle cx={rx} cy="47" r="4.5" />
          </g>
        );
      case 'suspicious':
        return (
          <g fill="white">
            <rect x={lx - 6} y="45" width="12" height="5" rx="2.5" />
            <rect x={rx - 6} y="45" width="12" height="5" rx="2.5" />
          </g>
        );
      case 'confused':
        return (
          <g fill="white">
            <circle cx={lx} cy="46" r="6.5" />
            <rect x={rx - 4.25} y="42" width="8.5" height="14" rx="4.25" transform={`rotate(-18 ${rx} 49)`} />
          </g>
        );
      case 'curious':
        return (
          <g fill="white">
            <rect x={lx - 4.25} y="34" width="8.5" height="19" rx="4.25" transform={`rotate(-10 ${lx} 44)`} />
            <circle cx={rx} cy="47" r="6.5" />
          </g>
        );
      case 'proud':
        return (
          <g stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d={`M ${lx - 6} 50 C ${lx - 6} 43, ${lx + 6} 43, ${lx + 6} 50`} />
            <path d={`M ${rx - 6} 50 C ${rx - 6} 43, ${rx + 6} 43, ${rx + 6} 50`} />
          </g>
        );
      case 'shy':
        return (
          <g>
            <rect x={lx - 3.75} y="44" width="7.5" height="15" rx="3.75" fill="white" />
            <rect x={rx - 3.75} y="44" width="7.5" height="15" rx="3.75" fill="white" />
            <circle cx={lx - 10} cy="56" r="3" fill="#FDA4AF" opacity="0.8" />
            <circle cx={rx + 10} cy="56" r="3" fill="#FDA4AF" opacity="0.8" />
          </g>
        );
      case 'unimpressed':
        return (
          <g fill="white">
            <rect x={lx - 6} y="44" width="12" height="6" rx="3" />
            <rect x={rx - 6} y="44" width="12" height="6" rx="3" />
          </g>
        );
      case 'sleepy':
        return (
          <g stroke="white" strokeWidth="4.5" strokeLinecap="round">
            <line x1={lx - 7} y1="48" x2={lx + 7} y2="48" />
            <line x1={rx - 7} y1="48" x2={rx + 7} y2="48" />
          </g>
        );
      default:
        return (
          <g fill="white">
            <rect x={lx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(-15 ${lx} 48)`} />
            <rect x={rx - 4.25} y="38" width="8.5" height="19" rx="4.25" transform={`rotate(-15 ${rx} 48)`} />
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

        {/* Eyes Group with Smooth 360-Degree Cursor Gaze Tracking, Shape Centering, & Clip Boundary */}
        <g clipPath={`url(#${clipId})`}>
          <g transform={`translate(0, ${currentShapeOffset.offsetY})`}>
            <g
              ref={eyesGazeRef}
              style={{
                transform: 'translate3d(0px, 0px, 0)',
                transition: 'transform 0.04s ease-out',
                willChange: 'transform',
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

export const BotAvatar = React.memo(BotAvatarInner);
export default BotAvatar;
