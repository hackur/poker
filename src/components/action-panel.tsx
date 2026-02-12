'use client';

import { useState, useCallback } from 'react';
import type { ValidAction, PlayerAction } from '@/lib/poker/types';

interface ActionPanelProps {
  validActions: ValidAction[];
  onAction: (action: PlayerAction) => void;
  currentBet: number;
  myBet: number;
  bigBlind: number;
}

export function ActionPanel({ validActions, onAction, currentBet, myBet, bigBlind }: ActionPanelProps) {
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

  const handleRaiseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRaiseAmount(Math.max(minAmount, Math.min(maxAmount, Number(e.target.value))));
    },
    [minAmount, maxAmount],
  );

  if (validActions.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-gray-500">
        Waiting for your turn...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900/80 backdrop-blur rounded-xl border border-gray-700">
      <div className="flex gap-2 justify-center flex-wrap">
        {/* Fold */}
        <button
          onClick={() => onAction({ type: 'fold' })}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
        >
          Fold
        </button>

        {/* Check */}
        {canCheck && (
          <button
            onClick={() => onAction({ type: 'check' })}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Check
          </button>
        )}

        {/* Call */}
        {canCall && callAction && (
          <button
            onClick={() => onAction({ type: 'call' })}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
          >
            Call ${toCall}
          </button>
        )}

        {/* Bet / Raise */}
        {sizeableAction && (
          <button
            onClick={() =>
              onAction({
                type: sizeableAction.type as 'bet' | 'raise',
                amount: raiseAmount,
              })
            }
            className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
          >
            {betAction ? 'Bet' : 'Raise'} ${raiseAmount}
          </button>
        )}

        {/* All-in */}
        {validActions.some((a) => a.type === 'all_in') && (
          <button
            onClick={() => onAction({ type: 'all_in' })}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            All In
          </button>
        )}
      </div>

      {/* Raise slider */}
      {sizeableAction && maxAmount > minAmount && (
        <div className="flex items-center gap-3 px-2">
          <span className="text-gray-400 text-xs font-mono w-12">${minAmount}</span>
          <input
            type="range"
            min={minAmount}
            max={maxAmount}
            value={raiseAmount}
            onChange={handleRaiseChange}
            className="flex-1 accent-yellow-500 h-2"
          />
          <span className="text-gray-400 text-xs font-mono w-12 text-right">${maxAmount}</span>

          {/* Quick bet buttons */}
          <div className="flex gap-1 ml-2">
            {[0.5, 0.75, 1].map((fraction) => {
              const pot = currentBet * 2 + myBet; // Approximate pot
              const amount = Math.max(minAmount, Math.min(maxAmount, Math.round(pot * fraction || bigBlind * 3)));
              return (
                <button
                  key={fraction}
                  onClick={() => setRaiseAmount(amount)}
                  className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  {fraction === 1 ? 'Pot' : `${fraction * 100}%`}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
