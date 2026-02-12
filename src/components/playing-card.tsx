'use client';

import type { Card } from '@/lib/poker/types';
import { RANK_DISPLAY, SUIT_DISPLAY, SUIT_COLOR } from '@/lib/poker/types';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: 'w-10', height: 'h-14', rank: 'text-xs', suit: 'text-sm' },
  md: { width: 'w-14', height: 'h-20', rank: 'text-sm', suit: 'text-lg' },
  lg: { width: 'w-20', height: 'h-28', rank: 'text-lg', suit: 'text-2xl' },
};

export function PlayingCard({ card, faceDown = false, size = 'md' }: PlayingCardProps) {
  const s = SIZES[size];

  if (faceDown || !card) {
    return (
      <div
        className={`${s.width} ${s.height} rounded-lg border-2 border-blue-800 flex items-center justify-center shrink-0`}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 25%, #2a4a7f 50%, #1e3a5f 75%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <span className="text-blue-300 text-xl">✦</span>
      </div>
    );
  }

  const color = SUIT_COLOR[card.suit];
  const textColor = color === 'red' ? 'text-red-600' : 'text-gray-900';

  return (
    <div
      className={`${s.width} ${s.height} rounded-lg border border-gray-300 bg-white flex flex-col items-center justify-center shrink-0 relative`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
    >
      <span className={`${s.rank} font-bold ${textColor} absolute top-1 left-1.5`}>
        {RANK_DISPLAY[card.rank]}
      </span>
      <span className={`${s.suit} ${textColor}`}>{SUIT_DISPLAY[card.suit]}</span>
      <span className={`${s.rank} font-bold ${textColor} absolute bottom-1 right-1.5 rotate-180`}>
        {RANK_DISPLAY[card.rank]}
      </span>
    </div>
  );
}
