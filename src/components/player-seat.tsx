'use client';

import { motion } from 'framer-motion';
import type { PublicPlayerInfo, Card } from '@/lib/poker/types';
import { AnimatedCard } from './animated-card';
import { ChipStack } from './chip-stack';
import { WinnerHighlight } from './winner-overlay';
import { SeatThinkingIndicator } from './thinking-indicator';

interface PlayerSeatProps {
  player: PublicPlayerInfo;
  isDealer: boolean;
  isHero: boolean;
  heroCards?: Card[];
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
  const isActive = player.isActive;
  const hasCards = player.hasCards;

  return (
    <motion.div 
      className="flex flex-col items-center gap-1 relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Winner highlight */}
      <WinnerHighlight isWinner={isWinner} />

      {/* Cards above the player info */}
      <div className="flex gap-1 h-14">
        {hasCards && isHero && heroCards ? (
          heroCards.map((card, i) => (
            <AnimatedCard 
              key={`${handNumber}-hero-${i}`} 
              card={card} 
              size="sm" 
              delay={i * 0.1}
              dealFrom="deck"
            />
          ))
        ) : hasCards && player.showCards ? (
          player.showCards.map((card, i) => (
            <AnimatedCard 
              key={`${handNumber}-show-${i}`} 
              card={card} 
              size="sm" 
              delay={i * 0.1}
              flip={true}
            />
          ))
        ) : hasCards ? (
          <>
            <AnimatedCard faceDown size="sm" delay={0} dealFrom="deck" />
            <AnimatedCard faceDown size="sm" delay={0.1} dealFrom="deck" />
          </>
        ) : null}
      </div>

      {/* Player info box */}
      <motion.div
        className={`
          relative rounded-xl px-3 py-2 min-w-[120px] text-center transition-all
          ${player.folded ? 'opacity-40' : ''}
          ${isHero ? 'bg-emerald-900/90 border border-emerald-500' : 'bg-gray-900/90 border border-gray-600'}
        `}
        animate={isActive ? {
          boxShadow: [
            '0 0 0 2px rgba(250, 204, 21, 0.5)',
            '0 0 0 4px rgba(250, 204, 21, 0.3)',
            '0 0 0 2px rgba(250, 204, 21, 0.5)',
          ],
        } : {
          boxShadow: 'none',
        }}
        transition={isActive ? {
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        } : {}}
      >
        {/* Dealer chip */}
        {isDealer && (
          <motion.div 
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center shadow"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            D
          </motion.div>
        )}

        {/* Bot badge */}
        {player.isBot && (
          <motion.div 
            className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            🤖 {player.botModel ?? 'Bot'}
          </motion.div>
        )}

        {/* Name */}
        <div className="text-white font-semibold text-sm truncate max-w-[110px]">
          {player.name}
        </div>

        {/* Stack */}
        <motion.div 
          className="text-yellow-300 text-xs font-mono"
          key={player.stack}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          ${player.stack.toLocaleString()}
        </motion.div>

        {/* Current bet */}
        {player.currentBet > 0 && (
          <motion.div 
            className="mt-1 text-[10px] text-orange-300"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Bet: ${player.currentBet}
          </motion.div>
        )}

        {/* All-in indicator */}
        {player.allIn && (
          <motion.div 
            className="mt-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wide"
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            All In
          </motion.div>
        )}

        {/* Thinking indicator */}
        <SeatThinkingIndicator isThinking={isActive && !player.folded} isBot={player.isBot} />
      </motion.div>

      {/* Bet chips (shown next to player) */}
      {player.currentBet > 0 && (
        <motion.div
          className="absolute -right-12 top-1/2 -translate-y-1/2"
          initial={{ scale: 0, x: -20 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <ChipStack amount={player.currentBet} size="sm" />
        </motion.div>
      )}
    </motion.div>
  );
}
