'use client';

import { motion } from 'framer-motion';
import type { PublicPlayerInfo, Card as CardType } from '@/lib/poker/types';
import { SPRING_SNAPPY } from '@/lib/ui-constants';
import { HoleCards } from './card';
import { ChipStack } from './chip-stack';
import { WinnerHighlight } from './winner-overlay';
import { ThinkingIndicator } from './thinking-indicator';

// ============================================================
// PlayerSeat — Player info box with cards and status
// ============================================================

interface PlayerSeatProps {
  player: PublicPlayerInfo;
  isDealer: boolean;
  isHero: boolean;
  heroCards?: CardType[];
  isWinner?: boolean;
  handNumber: number;
}

export function PlayerSeat({
  player,
  isDealer,
  isHero,
  heroCards,
  isWinner = false,
  handNumber,
}: PlayerSeatProps) {
  const { isActive, hasCards, folded, allIn, isBot, botModel, name, stack, currentBet, showCards } = player;

  return (
    <motion.div
      className="flex flex-col items-center gap-1 relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <WinnerHighlight isWinner={isWinner} />

      {/* Hole cards */}
      <div className="h-14">
        {hasCards && (
          <HoleCards
            cards={isHero && heroCards ? heroCards : showCards ?? []}
            faceDown={!isHero && !showCards}
            size="sm"
            animate
            handNumber={handNumber}
          />
        )}
      </div>

      {/* Player info box */}
      <motion.div
        className={`
          relative rounded-xl px-3 py-2 min-w-[120px] text-center transition-all
          ${folded ? 'opacity-40' : ''}
          ${isHero ? 'bg-emerald-900/90 border border-emerald-500' : 'bg-gray-900/90 border border-gray-600'}
        `}
        animate={
          isActive
            ? {
                boxShadow: [
                  '0 0 0 2px rgba(250, 204, 21, 0.5)',
                  '0 0 0 4px rgba(250, 204, 21, 0.3)',
                  '0 0 0 2px rgba(250, 204, 21, 0.5)',
                ],
              }
            : { boxShadow: 'none' }
        }
        transition={isActive ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        {/* Dealer button */}
        {isDealer && (
          <motion.div
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center shadow"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={SPRING_SNAPPY}
          >
            D
          </motion.div>
        )}

        {/* Bot badge */}
        {isBot && (
          <motion.div
            className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            🤖 {botModel ?? 'Bot'}
          </motion.div>
        )}

        {/* Name */}
        <div className="text-white font-semibold text-sm truncate max-w-[110px]">{name}</div>

        {/* Stack */}
        <motion.div
          className="text-yellow-300 text-xs font-mono"
          key={stack}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={SPRING_SNAPPY}
        >
          ${stack.toLocaleString()}
        </motion.div>

        {/* Current bet */}
        {currentBet > 0 && (
          <motion.div
            className="mt-1 text-[10px] text-orange-300"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Bet: ${currentBet}
          </motion.div>
        )}

        {/* All-in indicator */}
        {allIn && (
          <motion.div
            className="mt-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wide"
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            All In
          </motion.div>
        )}

        {/* Thinking indicator */}
        <ThinkingIndicator isActive={isActive && !folded} isBot={isBot} variant="compact" />
      </motion.div>

      {/* Bet chips */}
      {currentBet > 0 && (
        <motion.div
          className="absolute -right-12 top-1/2 -translate-y-1/2"
          initial={{ scale: 0, x: -20 }}
          animate={{ scale: 1, x: 0 }}
          transition={SPRING_SNAPPY}
        >
          <ChipStack amount={currentBet} size="sm" />
        </motion.div>
      )}
    </motion.div>
  );
}
