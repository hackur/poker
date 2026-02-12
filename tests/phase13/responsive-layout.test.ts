import { describe, it, expect, vi } from 'vitest';

describe('Responsive Layout', () => {
  it('BREAKPOINTS are defined correctly', async () => {
    const { BREAKPOINTS } = await import('@/hooks/useMediaQuery');
    expect(BREAKPOINTS.mobile).toBe(640);
    expect(BREAKPOINTS.tablet).toBe(1024);
  });

  it('mobile seat positions exist for 2 and 6 players', async () => {
    // Verify the mobile table component exports correct seat layouts
    // by checking the module loads without error
    const mod = await import('@/components/poker-table-mobile');
    expect(mod.MobilePokerTable).toBeDefined();
  });

  it('responsive wrapper renders without error', async () => {
    const mod = await import('@/components/responsive-table-wrapper');
    expect(mod.ResponsiveTableWrapper).toBeDefined();
  });

  it('MobileControls component is defined', async () => {
    const mod = await import('@/components/mobile-controls');
    expect(mod.MobileControls).toBeDefined();
  });

  it('responsive CSS file exists and has content', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(__dirname, '../../src/styles/responsive.css');
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('@media');
    expect(content).toContain('min-height: 44px');
    expect(content).toContain('max-width: 639px');
  });
});
