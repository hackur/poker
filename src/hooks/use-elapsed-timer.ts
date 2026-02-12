'use client';

import { useState, useEffect } from 'react';

/**
 * Hook that tracks elapsed seconds while active.
 * Resets to 0 when isActive becomes false.
 */
export function useElapsedTimer(isActive: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setElapsed(0);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  return elapsed;
}
