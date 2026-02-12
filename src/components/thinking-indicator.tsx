'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useElapsedTimer } from '@/hooks/use-elapsed-timer';

// ============================================================
// ThinkingIndicator — Shows when player is thinking
// ============================================================

interface ThinkingIndicatorProps {
  isActive: boolean;
  isBot?: boolean;
  variant?: 'full' | 'compact';
}

export function ThinkingIndicator({ isActive, isBot = false, variant = 'compact' }: ThinkingIndicatorProps) {
  const elapsed = useElapsedTimer(isActive);

  if (variant === 'full') {
    return (
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="flex items-center gap-2 bg-indigo-900/90 px-3 py-1.5 rounded-full"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
          >
            <PulsingEmoji emoji={isBot ? '🧠' : '🤔'} />
            <BouncingDots color="bg-indigo-300" />
            <span className="text-indigo-200 text-xs font-mono min-w-[24px]">{elapsed}s</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Compact variant for player seats
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
        >
          {isBot ? (
            <>
              <SpinningGear />
              <span className="text-indigo-300 text-xs font-mono">{elapsed}s</span>
            </>
          ) : (
            <BouncingDots color="bg-yellow-400" size="sm" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Reusable Animation Primitives
// ============================================================

function PulsingEmoji({ emoji }: { emoji: string }) {
  return (
    <motion.span
      className="text-lg"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    >
      {emoji}
    </motion.span>
  );
}

function SpinningGear() {
  return (
    <motion.span
      className="text-sm"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      ⚙️
    </motion.span>
  );
}

function BouncingDots({ color, size = 'md' }: { color: string; size?: 'sm' | 'md' }) {
  const dotSize = size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5';
  
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${dotSize} ${color} rounded-full`}
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
