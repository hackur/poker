'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ValidAction, PlayerAction } from '@/lib/poker/types';
import { SPRING_SNAPPY } from '@/lib/ui-constants';

// ============================================================
// Mobile Touch Action Controls
// ============================================================

interface MobileControlsProps {
  validActions: ValidAction[];
  onAction: (action: PlayerAction) => void;
  currentBet: number;
  myBet: number;
  bigBlind: number;
}

export function MobileControls({
  validActions,
  onAction,
  currentBet,
  myBet,
  bigBlind,
}: MobileControlsProps) {
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  const canCheck = validActions.some((a) => a.type === 'check');
  const canCall = validActions.some((a) => a.type === 'call');
  const callAction = validActions.find((a) => a.type === 'call');
  const betAction = validActions.find((a) => a.type === 'bet');
  const raiseAction = validActions.find((a) => a.type === 'raise');
  const sizeableAction = betAction ?? raiseAction;

  const minAmount = sizeableAction?.minAmount ?? bigBlind;
  const maxAmount = sizeableAction?.maxAmount ?? 1000;
  const [raiseAmount, setRaiseAmount] = useState(minAmount);
  const toCall = currentBet - myBet;

  const handleRaise = useCallback(() => {
    if (sizeableAction) {
      onAction({ type: sizeableAction.type as 'bet' | 'raise', amount: raiseAmount });
      setShowRaiseSlider(false);
    }
  }, [sizeableAction, raiseAmount, onAction]);

  if (validActions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full px-2 pb-2">
      {/* Raise slider overlay */}
      <AnimatePresence>
        {showRaiseSlider && sizeableAction && (
          <motion.div
            className="bg-gray-900/95 backdrop-blur rounded-xl p-4 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-sm font-semibold">
                {betAction ? 'Bet' : 'Raise'}: ${raiseAmount}
              </span>
              <button
                onClick={() => setShowRaiseSlider(false)}
                className="text-gray-400 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <input
              type="range"
              min={minAmount}
              max={maxAmount}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              className="w-full accent-yellow-500 h-3 mb-3"
              style={{ minHeight: '44px' }}
            />
            {/* Quick amounts */}
            <div className="flex gap-2 mb-3">
              {[
                { label: 'Min', val: minAmount },
                { label: '2×BB', val: Math.min(maxAmount, bigBlind * 2) },
                { label: '3×BB', val: Math.min(maxAmount, bigBlind * 3) },
                { label: '½ Pot', val: Math.min(maxAmount, Math.max(minAmount, Math.round((currentBet * 2 + myBet) * 0.5))) },
                { label: 'Pot', val: Math.min(maxAmount, Math.max(minAmount, currentBet * 2 + myBet)) },
                { label: 'Max', val: maxAmount },
              ].map(({ label, val }) => (
                <button
                  key={label}
                  onClick={() => setRaiseAmount(Math.max(minAmount, val))}
                  className="flex-1 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium"
                  style={{ minHeight: '44px' }}
                >
                  {label}
                </button>
              ))}
            </div>
            <motion.button
              onClick={handleRaise}
              className="w-full py-3 bg-yellow-600 text-white rounded-xl font-bold text-base"
              style={{ minHeight: '48px' }}
              whileTap={{ scale: 0.97 }}
            >
              {betAction ? 'Bet' : 'Raise'} ${raiseAmount}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main action buttons */}
      {!showRaiseSlider && (
        <div className="flex gap-2">
          {/* Fold */}
          <motion.button
            onClick={() => onAction({ type: 'fold' })}
            className="flex-1 py-3 bg-red-600 active:bg-red-700 text-white rounded-xl font-bold text-base"
            style={{ minHeight: '48px' }}
            whileTap={{ scale: 0.95 }}
            transition={SPRING_SNAPPY}
          >
            Fold
          </motion.button>

          {/* Check / Call */}
          {canCheck && (
            <motion.button
              onClick={() => onAction({ type: 'check' })}
              className="flex-1 py-3 bg-blue-600 active:bg-blue-700 text-white rounded-xl font-bold text-base"
              style={{ minHeight: '48px' }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_SNAPPY}
            >
              Check
            </motion.button>
          )}
          {canCall && callAction && (
            <motion.button
              onClick={() => onAction({ type: 'call' })}
              className="flex-1 py-3 bg-teal-600 active:bg-teal-700 text-white rounded-xl font-bold text-base"
              style={{ minHeight: '48px' }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_SNAPPY}
            >
              Call ${toCall}
            </motion.button>
          )}

          {/* Raise / Bet */}
          {sizeableAction && (
            <motion.button
              onClick={() => setShowRaiseSlider(true)}
              className="flex-1 py-3 bg-yellow-600 active:bg-yellow-700 text-white rounded-xl font-bold text-base"
              style={{ minHeight: '48px' }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_SNAPPY}
            >
              {betAction ? 'Bet' : 'Raise'}
            </motion.button>
          )}

          {/* All-in */}
          {validActions.some((a) => a.type === 'all_in') && (
            <motion.button
              onClick={() => onAction({ type: 'all_in' })}
              className="flex-1 py-3 bg-purple-600 active:bg-purple-700 text-white rounded-xl font-bold text-base"
              style={{ minHeight: '48px' }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_SNAPPY}
            >
              All In
            </motion.button>
          )}
        </div>
      )}

      {/* Gesture hints */}
      <div className="flex justify-center gap-4 text-[10px] text-gray-600 py-1">
        <span>← Fold</span>
        <span>Tap = Check/Call</span>
        <span>Hold = Raise</span>
        <span>2× = All-in</span>
      </div>
    </div>
  );
}
