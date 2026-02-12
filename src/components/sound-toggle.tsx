'use client';

import { useState, useEffect, useCallback } from 'react';
import { audioManager } from '@/lib/audio';

export function SoundToggle() {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!audioManager) return;
    setMuted(audioManager.muted);
    return audioManager.subscribe(() => setMuted(audioManager.muted));
  }, []);

  const toggle = useCallback(() => {
    audioManager?.toggleMute();
  }, []);

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/80 text-gray-400 hover:text-white transition-colors"
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}
