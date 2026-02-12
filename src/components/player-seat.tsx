'use client';

import type { PublicPlayerInfo, Card } from '@/lib/poker/types';
import { PlayingCard } from './playing-card';

interface PlayerSeatProps {
  player: PublicPlayerInfo;
  isDealer: boolean;
  isHero: boolean;
  heroCards?: Card[];
}

export function PlayerSeat({ player, isDealer, isHero, heroCards }: PlayerSeatProps) {
  const isActive = player.isActive;
  const hasCards = player.hasCards;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Cards above the player info */}
      <div className="flex gap-1 h-14">
        {hasCards && isHero && heroCards ? (
          heroCards.map((card, i) => <PlayingCard key={i} card={card} size="sm" />)
        ) : hasCards && player.showCards ? (
          player.showCards.map((card, i) => <PlayingCard key={i} card={card} size="sm" />)
        ) : hasCards ? (
          <>
            <PlayingCard faceDown size="sm" />
            <PlayingCard faceDown size="sm" />
          </>
        ) : null}
      </div>

      {/* Player info box */}
      <div
        className={`
          relative rounded-xl px-3 py-2 min-w-[120px] text-center transition-all
          ${isActive ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent' : ''}
          ${player.folded ? 'opacity-40' : ''}
          ${isHero ? 'bg-emerald-900/90 border border-emerald-500' : 'bg-gray-900/90 border border-gray-600'}
        `}
      >
        {/* Dealer chip */}
        {isDealer && (
          <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center shadow">
            D
          </div>
        )}

        {/* Bot badge */}
        {player.isBot && (
          <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
            🤖 {player.botModel ?? 'Bot'}
          </div>
        )}

        {/* Name */}
        <div className="text-white font-semibold text-sm truncate max-w-[110px]">
          {player.name}
        </div>

        {/* Stack */}
        <div className="text-yellow-300 text-xs font-mono">
          ${player.stack.toLocaleString()}
        </div>

        {/* Current bet */}
        {player.currentBet > 0 && (
          <div className="mt-1 text-[10px] text-orange-300">
            Bet: ${player.currentBet}
          </div>
        )}

        {/* All-in indicator */}
        {player.allIn && (
          <div className="mt-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wide">
            All In
          </div>
        )}

        {/* Active timer indicator */}
        {isActive && !player.folded && (
          <div className="mt-1 h-1 bg-yellow-400/30 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full animate-shrink" />
          </div>
        )}
      </div>
    </div>
  );
}
