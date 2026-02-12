'use client';

import { motion } from 'framer-motion';
import { CHIP_SIZES, type ChipSize, getChipColor, formatChipAmount, SPRING_SNAPPY } from '@/lib/ui-constants';

// ============================================================
// ChipStack — Stacked poker chips with amount display
// ============================================================

interface ChipStackProps {
  amount: number;
  size?: ChipSize;
  animate?: boolean;
}

export function ChipStack({ amount, size = 'md', animate = true }: ChipStackProps) {
  if (amount <= 0) return null;

  const s = CHIP_SIZES[size];
  const chipColor = getChipColor(amount);
  const stackCount = Math.min(s.stack, Math.ceil(amount / 100));

  return (
    <motion.div
      className="relative flex flex-col-reverse items-center"
      initial={animate ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_SNAPPY}
    >
      {Array.from({ length: stackCount }, (_, i) => (
        <motion.div
          key={i}
          className={`${s.chip} ${chipColor.bg} ${chipColor.border} rounded-full border-2 flex items-center justify-center shadow-md`}
          style={{ marginTop: i > 0 ? -4 : 0 }}
          initial={animate ? { y: -20, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          {i === stackCount - 1 && (
            <span className={`${s.text} font-bold ${chipColor.text}`}>
              {formatChipAmount(amount)}
            </span>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================
// PotDisplay — Pot chips with labeled amount
// ============================================================

interface PotDisplayProps {
  amount: number;
  label?: string;
}

export function PotDisplay({ amount, label = 'Pot:' }: PotDisplayProps) {
  if (amount <= 0) return null;

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_SNAPPY}
    >
      <ChipStack amount={amount} size="md" />
      <motion.div
        className="bg-black/60 px-3 py-1 rounded-full"
        key={amount}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={SPRING_SNAPPY}
      >
        <span className="text-yellow-300 font-bold text-sm">
          {label} ${amount.toLocaleString()}
        </span>
      </motion.div>
    </motion.div>
  );
}
