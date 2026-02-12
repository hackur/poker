'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '@/lib/poker/types';
import { RANK_DISPLAY, SUIT_DISPLAY, SUIT_COLOR } from '@/lib/poker/types';

interface AnimatedCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
  dealFrom?: 'deck' | 'none';
  flip?: boolean;
}

const SIZES = {
  sm: { width: 'w-10', height: 'h-14', rank: 'text-xs', suit: 'text-sm' },
  md: { width: 'w-14', height: 'h-20', rank: 'text-sm', suit: 'text-lg' },
  lg: { width: 'w-20', height: 'h-28', rank: 'text-lg', suit: 'text-2xl' },
};

export function AnimatedCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  dealFrom = 'deck',
  flip = true,
}: AnimatedCardProps) {
  const s = SIZES[size];
  const showFace = !faceDown && card;

  const dealVariants = {
    hidden: dealFrom === 'deck' 
      ? { opacity: 0, y: -100, x: 100, rotateZ: -30, scale: 0.5 }
      : { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      y: 0, 
      x: 0, 
      rotateZ: 0, 
      scale: 1,
      transition: {
        delay,
        duration: 0.4,
        ease: 'easeOut' as const,
      },
    },
  };

  // Card back design
  const CardBack = () => (
    <div
      className={`${s.width} ${s.height} rounded-lg border-2 border-blue-800 flex items-center justify-center shrink-0 backface-hidden`}
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 25%, #2a4a7f 50%, #1e3a5f 75%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        backfaceVisibility: 'hidden',
      }}
    >
      <span className="text-blue-300 text-xl">✦</span>
    </div>
  );

  // Card face design
  const CardFace = ({ c }: { c: Card }) => {
    const color = SUIT_COLOR[c.suit];
    const textColor = color === 'red' ? 'text-red-600' : 'text-gray-900';

    return (
      <div
        className={`${s.width} ${s.height} rounded-lg border border-gray-300 bg-white flex flex-col items-center justify-center shrink-0 relative backface-hidden`}
        style={{ 
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          backfaceVisibility: 'hidden',
        }}
      >
        <span className={`${s.rank} font-bold ${textColor} absolute top-1 left-1.5`}>
          {RANK_DISPLAY[c.rank]}
        </span>
        <span className={`${s.suit} ${textColor}`}>{SUIT_DISPLAY[c.suit]}</span>
        <span className={`${s.rank} font-bold ${textColor} absolute bottom-1 right-1.5 rotate-180`}>
          {RANK_DISPLAY[c.rank]}
        </span>
      </div>
    );
  };

  if (!card && !faceDown) {
    // Empty slot
    return (
      <div className={`${s.width} ${s.height} rounded-lg border border-white/10 bg-white/5`} />
    );
  }

  return (
    <motion.div
      variants={dealVariants}
      initial="hidden"
      animate="visible"
      className="relative"
      style={{ perspective: 1000 }}
    >
      {flip && card ? (
        <motion.div
          className="relative"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: showFace ? 0 : 180 }}
          transition={{ duration: 0.5, delay: delay + 0.1 }}
        >
          {/* Front (face up) */}
          <div style={{ backfaceVisibility: 'hidden' }}>
            <CardFace c={card} />
          </div>
          {/* Back */}
          <div 
            className="absolute inset-0"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <CardBack />
          </div>
        </motion.div>
      ) : showFace ? (
        <CardFace c={card} />
      ) : (
        <CardBack />
      )}
    </motion.div>
  );
}

// Wrapper for community cards with staggered animation
interface AnimatedCommunityCardsProps {
  cards: Card[];
  handNumber: number;
}

export function AnimatedCommunityCards({ cards, handNumber }: AnimatedCommunityCardsProps) {
  return (
    <div className="flex gap-2 items-center justify-center">
      <AnimatePresence mode="wait">
        {Array.from({ length: 5 }, (_, i) => {
          const card = cards[i];
          return (
            <motion.div
              key={`${handNumber}-${i}-${card?.rank ?? 'empty'}-${card?.suit ?? ''}`}
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
            >
              {card ? (
                <AnimatedCard card={card} size="md" delay={0} dealFrom="none" flip={true} />
              ) : (
                <div className="w-14 h-20 rounded-lg border border-white/10 bg-white/5" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
