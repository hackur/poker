'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BOT_PROFILES } from '@/lib/poker/bot';

interface EmptySeatProps {
  seatNumber: number;
  onAddBot: (botProfile: string) => void;
  disabled?: boolean;
}

export function EmptySeat({ seatNumber, onAddBot, disabled = false }: EmptySeatProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleAddBot = (profile: string) => {
    onAddBot(profile);
    setShowMenu(false);
  };

  return (
    <div className="relative">
      {!showMenu ? (
        <motion.button
          className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600/50 
                     hover:bg-gray-700/70 hover:border-emerald-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => !disabled && setShowMenu(true)}
          disabled={disabled}
        >
          <div className="text-gray-400 text-xs">Empty Seat</div>
          {!disabled && (
            <div className="text-emerald-400 text-sm font-medium">+ Add Bot</div>
          )}
        </motion.button>
      ) : (
        <motion.div
          className="flex flex-col gap-1 p-2 rounded-xl bg-gray-900/95 border border-emerald-500/50 min-w-[140px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-white text-xs font-semibold px-2 py-1 border-b border-gray-700">
            Select Bot
          </div>
          {BOT_PROFILES.map((profile) => (
            <button
              key={profile.name}
              className="px-2 py-1.5 text-xs text-left rounded hover:bg-emerald-600/20 text-white transition-colors"
              onClick={() => handleAddBot(profile.name)}
            >
              <div className="font-medium">{profile.name}</div>
              <div className="text-[10px] text-gray-400">{profile.model}</div>
            </button>
          ))}
          <button
            className="px-2 py-1 text-xs text-gray-400 hover:text-white border-t border-gray-700 mt-1"
            onClick={() => setShowMenu(false)}
          >
            Cancel
          </button>
        </motion.div>
      )}
    </div>
  );
}
