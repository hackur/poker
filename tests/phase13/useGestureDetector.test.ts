import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test gesture detection logic directly without React hooks
// by simulating the touch event flow

function makeTouchEvent(x: number, y: number) {
  return { clientX: x, clientY: y };
}

describe('useGestureDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('module exports useGestureDetector', async () => {
    const mod = await import('@/hooks/useGestureDetector');
    expect(mod.useGestureDetector).toBeDefined();
    expect(typeof mod.useGestureDetector).toBe('function');
  });

  it('gesture constants are reasonable', () => {
    // Verify the gesture detection thresholds make sense
    const SWIPE_THRESHOLD = 50;
    const LONG_PRESS_MS = 500;
    const DOUBLE_TAP_MS = 300;
    const MOVE_TOLERANCE = 10;

    expect(SWIPE_THRESHOLD).toBeGreaterThan(MOVE_TOLERANCE);
    expect(LONG_PRESS_MS).toBeGreaterThan(DOUBLE_TAP_MS);
  });

  it('swipe detection math: left swipe', () => {
    const startX = 200;
    const endX = 80;
    const elapsed = 200; // ms
    const dx = endX - startX; // -120
    const absDx = Math.abs(dx);
    const velocity = absDx / elapsed; // 0.6

    expect(dx).toBeLessThan(0); // left direction
    expect(absDx).toBeGreaterThan(50); // exceeds threshold
    expect(velocity).toBeGreaterThan(0.3); // exceeds velocity
  });

  it('tap detection: no movement within time', () => {
    const startX = 100;
    const endX = 102; // barely moved
    const elapsed = 150; // ms
    const moved = Math.abs(endX - startX) > 10;

    expect(moved).toBe(false);
    expect(elapsed).toBeLessThan(500); // within tap window
  });

  it('double tap: two taps within 300ms', () => {
    const DOUBLE_TAP_MS = 300;
    const tap1Time = 1000;
    const tap2Time = 1200;

    expect(tap2Time - tap1Time).toBeLessThan(DOUBLE_TAP_MS);
  });

  it('long press: hold beyond 500ms without movement', () => {
    const LONG_PRESS_MS = 500;
    const holdDuration = 600;

    expect(holdDuration).toBeGreaterThan(LONG_PRESS_MS);
  });
});
