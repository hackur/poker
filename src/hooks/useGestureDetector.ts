'use client';

import { useRef, useCallback, useEffect } from 'react';

// ============================================================
// Touch Gesture Detection
// ============================================================

export type GestureType = 'tap' | 'doubletap' | 'longpress' | 'swipeleft' | 'swiperight' | 'swipeup' | 'swipedown';

export interface GestureCallbacks {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  moved: boolean;
}

const SWIPE_THRESHOLD = 50;    // px minimum swipe distance
const SWIPE_VELOCITY = 0.3;    // px/ms minimum velocity
const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;
const MOVE_TOLERANCE = 10;     // px tolerance before "moved"

export function useGestureDetector(
  callbacks: GestureCallbacks,
  enabled = true
) {
  const stateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    longPressTimer: null,
    moved: false,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const clearLongPress = useCallback(() => {
    if (stateRef.current.longPressTimer) {
      clearTimeout(stateRef.current.longPressTimer);
      stateRef.current.longPressTimer = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      const state = stateRef.current;
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.startTime = Date.now();
      state.moved = false;

      clearLongPress();
      state.longPressTimer = setTimeout(() => {
        if (!state.moved) {
          callbacksRef.current.onLongPress?.();
        }
      }, LONG_PRESS_MS);
    },
    [enabled, clearLongPress]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      const state = stateRef.current;
      const dx = Math.abs(touch.clientX - state.startX);
      const dy = Math.abs(touch.clientY - state.startY);
      if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
        state.moved = true;
        clearLongPress();
      }
    },
    [enabled, clearLongPress]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      clearLongPress();
      const state = stateRef.current;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;
      const elapsed = Date.now() - state.startTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Swipe detection
      if (state.moved && elapsed > 0) {
        const velocity = Math.max(absDx, absDy) / elapsed;
        if (velocity >= SWIPE_VELOCITY) {
          if (absDx > absDy && absDx > SWIPE_THRESHOLD) {
            if (dx < 0) callbacksRef.current.onSwipeLeft?.();
            else callbacksRef.current.onSwipeRight?.();
            return;
          }
          if (absDy > absDx && absDy > SWIPE_THRESHOLD) {
            if (dy < 0) callbacksRef.current.onSwipeUp?.();
            else callbacksRef.current.onSwipeDown?.();
            return;
          }
        }
      }

      // Tap / double-tap detection
      if (!state.moved && elapsed < LONG_PRESS_MS) {
        const now = Date.now();
        if (now - state.lastTapTime < DOUBLE_TAP_MS) {
          callbacksRef.current.onDoubleTap?.();
          state.lastTapTime = 0;
        } else {
          state.lastTapTime = now;
          // Delay single tap to allow double-tap detection
          setTimeout(() => {
            if (Date.now() - state.lastTapTime >= DOUBLE_TAP_MS && state.lastTapTime !== 0) {
              callbacksRef.current.onTap?.();
            }
          }, DOUBLE_TAP_MS);
        }
      }
    },
    [enabled, clearLongPress]
  );

  // Cleanup on unmount
  useEffect(() => clearLongPress, [clearLongPress]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
