'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// Responsive Breakpoints
// ============================================================

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useDeviceType(): DeviceType {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.mobile - 1}px)`);
  const isTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`);

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)');
}

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);
  return isTouch;
}

export function useResponsive() {
  const device = useDeviceType();
  const isLandscape = useIsLandscape();
  const isTouch = useIsTouchDevice();

  return {
    device,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    isLandscape,
    isTouch,
  };
}
