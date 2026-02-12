'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Card as CardType } from '@/lib/poker/types';
import { RANK_DISPLAY, SUIT_DISPLAY, SUIT_COLOR } from '@/lib/poker/types';
import { CARD_SIZES, type CardSize, SPRING_SNAPPY } from '@/lib/ui-constants';

// ============================================================
// Card Component — Unified card rendering with optional animation
// ============================================================

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  size?: CardSize;
  animate?: boolean;
  delay?: number;
}

export function Card({ card, faceDown = false, size = 'md', animate = false, delay = 0 }: CardProps) {
  const s = CARD_SIZES[size];

  // Empty slot
  if (!card && !faceDown) {
    return <div className={`${s.width} ${s.height} rounded-lg border border-white/10 bg-white/5`} />;
  }

  // Card back
  if (faceDown || !card) {
    const back = (
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

    return animate ? (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, ...SPRING_SNAPPY }}
      >
        {back}
      </motion.div>
    ) : back;
  }

  // Card face
  const color = SUIT_COLOR[card.suit];
  const textColor = color === 'red' ? 'text-red-600' : 'text-gray-900';

  const face = (
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

  return animate ? (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, ...SPRING_SNAPPY }}
    >
      {face}
    </motion.div>
  ) : face;
}

// ============================================================
// CommunityCards — 5 slots with staggered animation
// ============================================================

interface CommunityCardsProps {
  cards: CardType[];
  handNumber: number;
}

export function CommunityCards({ cards, handNumber }: CommunityCardsProps) {
  return (
    <div className="flex gap-2 items-center justify-center">
      <AnimatePresence mode="wait">
        {Array.from({ length: 5 }, (_, i) => (
          <motion.div
            key={`${handNumber}-${i}`}
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
          >
            <Card card={cards[i]} size="md" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// HoleCards — Player's cards (hero enlarged, others small)
// ============================================================

interface HoleCardsProps {
  cards: CardType[];
  faceDown?: boolean;
  size?: CardSize;
  animate?: boolean;
  handNumber?: number;
}

export function HoleCards({ cards, faceDown = false, size = 'sm', animate = false, handNumber = 0 }: HoleCardsProps) {
  if (cards.length === 0 && !faceDown) return null;

  return (
    <div className="flex gap-1">
      {faceDown ? (
        <>
          <Card faceDown size={size} animate={animate} delay={0} />
          <Card faceDown size={size} animate={animate} delay={0.1} />
        </>
      ) : (
        cards.map((card, i) => (
          <Card key={`${handNumber}-${i}`} card={card} size={size} animate={animate} delay={i * 0.1} />
        ))
      )}
    </div>
  );
}
