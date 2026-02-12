'use client';

import type { Pot } from '@/lib/poker/types';

interface PotDisplayProps {
  pots: Pot[];
}

export function PotDisplay({ pots }: PotDisplayProps) {
  const total = pots.reduce((sum, p) => sum + p.amount, 0);
  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full">
        <span className="text-yellow-500 text-lg">🪙</span>
        <span className="text-white font-bold text-lg">${total.toLocaleString()}</span>
      </div>
      {pots.length > 1 && (
        <div className="flex gap-2 text-xs text-gray-400">
          {pots.map((pot, i) => (
            <span key={i}>
              {i === 0 ? 'Main' : `Side ${i}`}: ${pot.amount}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
