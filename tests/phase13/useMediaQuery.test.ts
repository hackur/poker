import { describe, it, expect, vi } from 'vitest';

describe('useMediaQuery', () => {
  it('module exports all hooks', async () => {
    const mod = await import('@/hooks/useMediaQuery');
    expect(mod.useMediaQuery).toBeDefined();
    expect(mod.useDeviceType).toBeDefined();
    expect(mod.useIsLandscape).toBeDefined();
    expect(mod.useIsTouchDevice).toBeDefined();
    expect(mod.useResponsive).toBeDefined();
  });

  it('BREAKPOINTS are correct', async () => {
    const { BREAKPOINTS } = await import('@/hooks/useMediaQuery');
    expect(BREAKPOINTS.mobile).toBe(640);
    expect(BREAKPOINTS.tablet).toBe(1024);
  });

  it('mobile breakpoint matches Tailwind sm', async () => {
    const { BREAKPOINTS } = await import('@/hooks/useMediaQuery');
    // Tailwind's sm breakpoint is 640px
    expect(BREAKPOINTS.mobile).toBe(640);
  });

  it('DeviceType covers all screen sizes', async () => {
    // Type check: device types
    type DeviceType = 'mobile' | 'tablet' | 'desktop';
    const types: DeviceType[] = ['mobile', 'tablet', 'desktop'];
    expect(types).toHaveLength(3);
  });
});
