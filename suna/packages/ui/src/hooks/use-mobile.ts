import * as React from 'react';

import { useMediaQuery } from './use-media-query';

export const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}

/**
 * Below Tailwind's `sm` (640px): a phone. The composer's attach / agent row
 * moves under the card only here; a 720px desktop window keeps it inside.
 */
export function useIsPhone() {
  return useMediaQuery('(max-width: 639px)');
}

/**
 * True only when on a mobile-width screen in vertical (portrait) orientation.
 * Horizontal (landscape) phones keep the sidebar open when navigating.
 */
export function isPortraitMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const isPortrait =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(orientation: portrait)').matches
      : window.innerHeight >= window.innerWidth;
  return window.innerWidth < MOBILE_BREAKPOINT && isPortrait;
}
