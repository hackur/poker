'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_BOUNCY } from '@/lib/ui-constants';

// ============================================================
// WinnerOverlay — Full-screen celebration on hand win
// ============================================================

interface Winner {
  seat: number;
  amount: number;
  handName?: string;
  playerName: string;
}

interface WinnerOverlayProps {
  winners: Winner[];
  show: boolean;
}

const CONFETTI_COLORS = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1'];

export function WinnerOverlay({ winners, show }: WinnerOverlayProps) {
  if (winners.length === 0) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Confetti />
          <WinnerCard winners={winners} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            left: `${Math.random() * 100}%`,
          }}
          initial={{ y: -20, opacity: 1, scale: 1 }}
          animate={{ y: '100vh', opacity: 0, scale: 0, rotate: Math.random() * 360 }}
          transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

function WinnerCard({ winners }: { winners: Winner[] }) {
  return (
    <motion.div
      className="bg-gradient-to-br from-yellow-500 via-yellow-400 to-amber-500 rounded-2xl p-1 shadow-2xl"
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 10 }}
      transition={SPRING_BOUNCY}
    >
      <div className="bg-gray-900 rounded-xl px-8 py-6 text-center">
        <motion.div
          className="text-4xl mb-2"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          🏆
        </motion.div>

        {winners.map((winner, i) => (
          <motion.div
            key={winner.seat}
            className="mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <div className="text-2xl font-bold text-white">{winner.playerName}</div>
            <div className="text-yellow-400 font-bold text-xl">
              Wins ${winner.amount.toLocaleString()}
            </div>
            {winner.handName && (
              <div className="text-emerald-400 text-sm mt-1">{winner.handName}</div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================
// WinnerHighlight — Pulsing glow for winner seats
// ============================================================

interface WinnerHighlightProps {
  isWinner: boolean;
}

export function WinnerHighlight({ isWinner }: WinnerHighlightProps) {
  return (
    <AnimatePresence>
      {isWinner && (
        <motion.div
          className="absolute inset-0 -m-2 rounded-2xl pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(234, 179, 8, 0.1))',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(251, 191, 36, 0.1)',
          }}
        />
      )}
    </AnimatePresence>
  );
}
