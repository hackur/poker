'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerGameView, PlayerAction } from '@/lib/poker/types';
import { PlayerSeat } from './player-seat';
import { AnimatedCommunityCards } from './animated-card';
import { AnimatedPotDisplay } from './chip-stack';
import { ActionPanel } from './action-panel';
import { AnimatedCard } from './animated-card';
import { WinnerOverlay } from './winner-overlay';
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
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevHandRef = useRef<number>(0);

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

  // Show winner overlay on hand completion
  useEffect(() => {
    if (gameState?.winners && gameState.winners.length > 0) {
      if (gameState.handNumber !== prevHandRef.current) {
        setShowWinnerOverlay(true);
        prevHandRef.current = gameState.handNumber;
        // Auto-hide after 3 seconds
        const timer = setTimeout(() => setShowWinnerOverlay(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.winners, gameState?.handNumber]);

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
        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-400">Connecting to table...</p>
        </motion.div>
      </div>
    );
  }

  const myPlayer = gameState.players.find((p) => p.seat === gameState.mySeat);
  const isMyTurn = myPlayer?.isActive && gameState.validActions.length > 0;
  const winnerSeats = new Set(gameState.winners?.map((w) => w.seat) ?? []);
  const totalPot = gameState.pots.reduce((sum, p) => sum + p.amount, 0);

  // Build winner data for overlay
  const winnerData = (gameState.winners ?? []).map((w) => ({
    ...w,
    playerName: gameState.players.find((p) => p.seat === w.seat)?.name ?? 'Unknown',
  }));

  return (
    <div className="relative w-full h-screen bg-gray-950 overflow-hidden select-none">
      {/* Winner overlay */}
      <WinnerOverlay winners={winnerData} show={showWinnerOverlay} />

      {/* Header */}
      <motion.div 
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold text-lg">♠ Poker</h1>
          <span className="text-gray-500 text-sm">Hand #{gameState.handNumber}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Blinds: ${gameState.smallBlind}/${gameState.bigBlind}</span>
          <span className="text-gray-600">|</span>
          <motion.span 
            className={`capitalize ${
              gameState.phase === 'showdown' ? 'text-yellow-400' : 'text-emerald-400'
            }`}
            key={gameState.phase}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {gameState.phase}
          </motion.span>
        </div>
      </motion.div>

      {/* Table felt */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative w-[85%] max-w-[900px] aspect-[16/10]"
          style={{
            background: 'radial-gradient(ellipse at center, #1a6b3c 0%, #0d5c2e 50%, #0a4423 100%)',
            borderRadius: '50%',
            border: '8px solid #2a1a0a',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.6)',
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="absolute inset-[-12px] rounded-[50%]"
            style={{ border: '4px solid #3d2b1f', background: 'transparent' }}
          />

          {/* Community cards + pot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <AnimatedCommunityCards 
              cards={gameState.communityCards} 
              handNumber={gameState.handNumber}
            />
            <AnimatedPotDisplay amount={totalPot} />
            
            {/* Phase message */}
            <AnimatePresence mode="wait">
              {gameState.phase === 'waiting' && (
                <motion.div
                  key="waiting"
                  className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  Waiting for hand to start...
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player seats */}
          {gameState.players.map((player) => (
            <div key={player.seat} className="absolute" style={getSeatPositions(gameState.players.length)[player.seat]}>
              <PlayerSeat
                player={player}
                isDealer={player.seat === gameState.dealerSeat}
                isHero={player.seat === gameState.mySeat}
                heroCards={player.seat === gameState.mySeat ? gameState.myCards : undefined}
                isWinner={winnerSeats.has(player.seat)}
                handNumber={gameState.handNumber}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Hero's enlarged cards */}
      <AnimatePresence>
        {gameState.myCards.length > 0 && (
          <motion.div 
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 flex gap-2"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            {gameState.myCards.map((card, i) => (
              <AnimatedCard 
                key={`hero-lg-${gameState.handNumber}-${i}`} 
                card={card} 
                size="lg" 
                delay={i * 0.15}
                dealFrom="deck"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Showdown results */}
      <AnimatePresence>
        {gameState.showdownHands && gameState.showdownHands.length > 0 && (
          <motion.div 
            className="absolute bottom-28 right-4 z-10 bg-black/70 rounded-xl p-3 text-xs text-white space-y-1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <div className="font-bold text-yellow-400 mb-1">Showdown</div>
            {gameState.showdownHands.map((sh) => {
              const p = gameState.players.find((pl) => pl.seat === sh.seat);
              const isWinner = winnerSeats.has(sh.seat);
              return (
                <motion.div 
                  key={sh.seat} 
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className={`font-medium ${isWinner ? 'text-yellow-300' : 'text-gray-300'}`}>
                    {p?.name}:
                  </span>
                  <span className="text-emerald-300">{sh.handName}</span>
                  {isWinner && <span className="text-yellow-400">🏆</span>}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-4 px-4">
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.div
              key="action"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <ActionPanel
                validActions={gameState.validActions}
                onAction={handleAction}
                currentBet={gameState.currentBet}
                myBet={myPlayer?.currentBet ?? 0}
                bigBlind={gameState.bigBlind}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="waiting"
              className="text-gray-600 text-sm py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {gameState.phase === 'showdown' ? '' : 'Waiting for other players...'}
            </motion.div>
          )}
        </AnimatePresence>
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
