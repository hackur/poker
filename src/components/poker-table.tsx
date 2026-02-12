'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { PlayerGameView, PlayerAction } from '@/lib/poker/types';
import { PlayerSeat } from './player-seat';
import { CommunityCards } from './community-cards';
import { PotDisplay } from './pot-display';
import { ActionPanel } from './action-panel';
import { PlayingCard } from './playing-card';
import { DebugPanel } from './debug-panel';

// Seat positions around the table (6-max)
const SEAT_POSITIONS_6: Record<number, React.CSSProperties> = {
  0: { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
  1: { bottom: '32%', left: '4%' },
  2: { top: '8%', left: '14%' },
  3: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
  4: { top: '8%', right: '14%' },
  5: { bottom: '32%', right: '4%' },
};

// Seat positions for heads-up (2 players)
const SEAT_POSITIONS_2: Record<number, React.CSSProperties> = {
  0: { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
  1: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
};

function getSeatPositions(playerCount: number): Record<number, React.CSSProperties> {
  return playerCount <= 2 ? SEAT_POSITIONS_2 : SEAT_POSITIONS_6;
}

interface PokerTableProps {
  tableId: string;
}

export function PokerTable({ tableId }: PokerTableProps) {
  const [gameState, setGameState] = useState<PlayerGameView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for game state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/table/${tableId}`);
      if (res.ok) {
        const view = await res.json();
        setGameState(view);
      }
    } catch {
      // Will retry on next poll
    }
  }, [tableId]);

  useEffect(() => {
    fetchState();
    pollingRef.current = setInterval(fetchState, 1000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchState]);

  // Winner message
  useEffect(() => {
    if (gameState?.winners && gameState.winners.length > 0) {
      const winnerNames = gameState.winners.map((w) => {
        const p = gameState.players.find((pl) => pl.seat === w.seat);
        return `${p?.name ?? '?'} wins $${w.amount}${w.handName ? ` (${w.handName})` : ''}`;
      });
      setMessage(winnerNames.join(' · '));
    } else if (gameState?.phase === 'waiting') {
      setMessage('Waiting for hand to start...');
    } else {
      setMessage(null);
    }
  }, [gameState?.winners, gameState?.phase, gameState?.players]);

  // Submit action
  const handleAction = useCallback(async (action: PlayerAction) => {
    try {
      const res = await fetch(`/api/v1/table/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) setGameState(await res.json());
    } catch { /* noop */ }
  }, [tableId]);

  // Debug: update bot
  const handleUpdateBot = useCallback(async (botId: string, field: string, value: string | number) => {
    try {
      const res = await fetch(`/api/v1/table/${tableId}/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'update_bot', botId, field, value }),
      });
      if (res.ok) setGameState(await res.json());
    } catch { /* noop */ }
  }, [tableId]);

  // Debug: reset game
  const handleResetGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/table/${tableId}/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'reset' }),
      });
      if (res.ok) setGameState(await res.json());
    } catch { /* noop */ }
  }, [tableId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      const myPlayer = gameState?.players.find((p) => p.seat === gameState?.mySeat);
      const isMyTurn = myPlayer?.isActive && (gameState?.validActions?.length ?? 0) > 0;
      if (!isMyTurn) return;

      switch (e.key.toLowerCase()) {
        case 'f':
          handleAction({ type: 'fold' });
          break;
        case 'c':
          if (gameState?.validActions.some((a) => a.type === 'check')) {
            handleAction({ type: 'check' });
          } else if (gameState?.validActions.some((a) => a.type === 'call')) {
            handleAction({ type: 'call' });
          }
          break;
        case 'r': {
          const raiseAction = gameState?.validActions.find((a) => a.type === 'raise');
          const betAction = gameState?.validActions.find((a) => a.type === 'bet');
          const action = raiseAction ?? betAction;
          if (action) {
            handleAction({ type: action.type as 'raise' | 'bet', amount: action.minAmount });
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleAction]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Connecting to table...</p>
        </div>
      </div>
    );
  }

  const myPlayer = gameState.players.find((p) => p.seat === gameState.mySeat);
  const isMyTurn = myPlayer?.isActive && gameState.validActions.length > 0;

  return (
    <div className="relative w-full h-screen bg-gray-950 overflow-hidden select-none">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold text-lg">♠ Poker</h1>
          <span className="text-gray-500 text-sm">Hand #{gameState.handNumber}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Blinds: ${gameState.smallBlind}/${gameState.bigBlind}</span>
          <span className="text-gray-600">|</span>
          <span className={`capitalize ${
            gameState.phase === 'showdown' ? 'text-yellow-400' : 'text-emerald-400'
          }`}>
            {gameState.phase}
          </span>
        </div>
      </div>

      {/* Table felt */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative w-[85%] max-w-[900px] aspect-[16/10]"
          style={{
            background: 'radial-gradient(ellipse at center, #1a6b3c 0%, #0d5c2e 50%, #0a4423 100%)',
            borderRadius: '50%',
            border: '8px solid #2a1a0a',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.6)',
          }}
        >
          <div
            className="absolute inset-[-12px] rounded-[50%]"
            style={{ border: '4px solid #3d2b1f', background: 'transparent' }}
          />

          {/* Community cards + pot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <CommunityCards cards={gameState.communityCards} />
            <PotDisplay pots={gameState.pots} />
            {message && (
              <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium animate-fade-in">
                {message}
              </div>
            )}
          </div>

          {/* Player seats */}
          {gameState.players.map((player) => (
            <div key={player.seat} className="absolute" style={getSeatPositions(gameState.players.length)[player.seat]}>
              <PlayerSeat
                player={player}
                isDealer={player.seat === gameState.dealerSeat}
                isHero={player.seat === gameState.mySeat}
                heroCards={player.seat === gameState.mySeat ? gameState.myCards : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Hero's enlarged cards */}
      {gameState.myCards.length > 0 && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {gameState.myCards.map((card, i) => (
            <PlayingCard key={i} card={card} size="lg" />
          ))}
        </div>
      )}

      {/* Showdown results */}
      {gameState.showdownHands && gameState.showdownHands.length > 0 && (
        <div className="absolute bottom-28 right-4 z-10 bg-black/70 rounded-xl p-3 text-xs text-white space-y-1">
          <div className="font-bold text-yellow-400 mb-1">Showdown</div>
          {gameState.showdownHands.map((sh) => {
            const p = gameState.players.find((pl) => pl.seat === sh.seat);
            return (
              <div key={sh.seat} className="flex items-center gap-2">
                <span className={`font-medium ${
                  gameState.winners?.some((w) => w.seat === sh.seat) ? 'text-yellow-300' : 'text-gray-300'
                }`}>
                  {p?.name}:
                </span>
                <span className="text-emerald-300">{sh.handName}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Action panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-4 px-4">
        {isMyTurn ? (
          <ActionPanel
            validActions={gameState.validActions}
            onAction={handleAction}
            currentBet={gameState.currentBet}
            myBet={myPlayer?.currentBet ?? 0}
            bigBlind={gameState.bigBlind}
          />
        ) : (
          <div className="text-gray-600 text-sm py-4">
            {gameState.phase === 'showdown' ? '' : 'Waiting for other players...'}
          </div>
        )}
      </div>

      {/* Debug panel */}
      <DebugPanel
        gameState={gameState}
        onUpdateBot={handleUpdateBot}
        onResetGame={handleResetGame}
      />
    </div>
  );
}
