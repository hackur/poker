'use client';

import { useEffect, useRef } from 'react';
import { audioManager } from './index';
import type { PlayerGameView } from '@/lib/poker/types';

/**
 * Hook that watches game state changes and plays appropriate sounds.
 */
export function useGameSounds(gameState: PlayerGameView | null) {
  const prev = useRef<{
    handNumber: number;
    phase: string;
    isMyTurn: boolean;
    communityCount: number;
    winners: number;
    lastAction: string;
  } | null>(null);

  useEffect(() => {
    if (!gameState || !audioManager) return;

    const myPlayer = gameState.players.find((p) => p.seat === gameState.mySeat);
    const isMyTurn = !!(myPlayer?.isActive && gameState.validActions.length > 0);
    const communityCount = gameState.communityCards.length;
    const winnersCount = gameState.winners?.length ?? 0;

    const p = prev.current;

    if (p) {
      // New hand started — deal sound
      if (gameState.handNumber !== p.handNumber && gameState.phase !== 'waiting') {
        audioManager.play('deal');
      }

      // New community cards dealt (flop/turn/river)
      if (communityCount > p.communityCount && gameState.handNumber === p.handNumber) {
        audioManager.play('deal');
      }

      // It just became my turn
      if (isMyTurn && !p.isMyTurn) {
        audioManager.play('yourTurn');
      }

      // Winner announced
      if (winnersCount > 0 && p.winners === 0) {
        const iWon = gameState.winners?.some((w) => w.seat === gameState.mySeat);
        if (iWon) {
          audioManager.play('win');
        } else {
          audioManager.play('chip');
        }
      }

      // Phase changed to showdown
      if (gameState.phase === 'showdown' && p.phase !== 'showdown') {
        // showdown sound handled by winner
      }
    }

    prev.current = {
      handNumber: gameState.handNumber,
      phase: gameState.phase,
      isMyTurn,
      communityCount,
      winners: winnersCount,
      lastAction: '',
    };
  }, [gameState]);
}

/**
 * Play a sound for a player action (call from action handler).
 */
export function playActionSound(actionType: string) {
  if (!audioManager) return;
  switch (actionType) {
    case 'fold': audioManager.play('fold'); break;
    case 'check': audioManager.play('check'); break;
    case 'call': audioManager.play('call'); audioManager.play('chip'); break;
    case 'bet':
    case 'raise': audioManager.play('raise'); audioManager.play('chip'); break;
    case 'all_in': audioManager.play('allIn'); break;
  }
}
