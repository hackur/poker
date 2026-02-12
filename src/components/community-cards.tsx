'use client';

import type { Card } from '@/lib/poker/types';
import { PlayingCard } from './playing-card';

interface CommunityCardsProps {
  cards: Card[];
}

export function CommunityCards({ cards }: CommunityCardsProps) {
  // Always show 5 slots
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);

  return (
    <div className="flex gap-2 items-center justify-center">
      {slots.map((card, i) => (
        <div key={i} className={card ? 'animate-deal' : ''} style={{ animationDelay: `${i * 100}ms` }}>
          {card ? (
            <PlayingCard card={card} size="md" />
          ) : (
            <div className="w-14 h-20 rounded-lg border border-white/10 bg-white/5" />
          )}
        </div>
      ))}
    </div>
  );
}
