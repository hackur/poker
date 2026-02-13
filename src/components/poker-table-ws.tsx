'use client';

/**
 * WebSocket-enabled Poker Table
 * 
 * Uses WebSocket for real-time updates with polling fallback.
 * Drop-in replacement for PokerTable with identical UI.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerGameView, PlayerAction } from '@/lib/poker/types';
import { PlayerSeat } from './player-seat';
import { CommunityCards, HoleCards } from './card';
import { PotDisplay } from './chip-stack';
import { ActionPanel } from './action-panel';
import { WinnerOverlay } from './winner-overlay';
import { DebugPanel } from './debug-panel';
import { SoundToggle } from './sound-toggle';
import { useGameSounds, playActionSound } from '@/lib/audio/use-game-sounds';
import { ChatPanel } from './chat-panel';
import { useGameWebSocket } from '@/hooks/useGameWebSocket';
import { BOT_PROFILES } from '@/lib/poker/bot';

interface UserInfo {
  id: string;
  displayName: string;
  balance: number;
}

// ============================================================
// Seat Layout Constants
// ============================================================

const SEAT_POSITIONS: Record<number, Record<number, React.CSSProperties>> = {
  2: {
    0: { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
    1: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
  },
  6: {
    0: { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
    1: { bottom: '32%', left: '4%' },
    2: { top: '8%', left: '14%' },
    3: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
    4: { top: '8%', right: '14%' },
    5: { bottom: '32%', right: '4%' },
  },
};

function getSeatPosition(playerCount: number, seat: number): React.CSSProperties {
  const layout = playerCount <= 2 ? SEAT_POSITIONS[2] : SEAT_POSITIONS[6];
  return layout[seat] ?? {};
}

// ============================================================
// Connection Status Indicator
// ============================================================

interface ConnectionStatusProps {
  state: 'connecting' | 'connected' | 'disconnected' | 'error';
  latency: number;
  onReconnect: () => void;
}

function ConnectionStatus({ state, latency, onReconnect }: ConnectionStatusProps) {
  const colors = {
    connecting: 'bg-yellow-500',
    connected: 'bg-emerald-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${colors[state]}`} />
      {state === 'connected' && latency > 0 && (
        <span className="text-gray-500">{latency}ms</span>
      )}
      {(state === 'disconnected' || state === 'error') && (
        <button 
          onClick={onReconnect}
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}

// ============================================================
// Empty Seat Menu Component
// ============================================================

interface EmptySeatMenuProps {
  seat: number;
  tableId: string;
  playerId: string;
  onAction: () => void;
}

function EmptySeatMenu({ seat, tableId, playerId, onAction }: EmptySeatMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSitHere = async () => {
    setOpen(false);
    await fetch(`/api/v1/table/${tableId}/move-seat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, toSeat: seat }),
    });
    onAction();
  };

  const handleAddBot = async (profileName: string) => {
    setOpen(false);
    await fetch(`/api/v1/table/${tableId}/add-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botProfile: profileName, seat, playerId }),
    });
    onAction();
  };

  if (!open) {
    return (
      <motion.button
        className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/40 border border-gray-600/30 
                   hover:bg-gray-700/60 hover:border-emerald-500/40 transition-all text-gray-500 hover:text-emerald-400 text-2xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.6, scale: 1 }}
        whileHover={{ opacity: 1, scale: 1.05 }}
        onClick={() => setOpen(true)}
        title={`Seat ${seat + 1}`}
      >
        +
      </motion.button>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-0.5 p-2 rounded-xl bg-gray-900/95 border border-emerald-500/50 min-w-[140px] z-30"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <button
        className="px-2 py-1.5 text-xs text-left rounded hover:bg-emerald-600/20 text-emerald-300 font-medium transition-colors"
        onClick={handleSitHere}
      >
        🪑 Sit Here
      </button>
      <div className="border-t border-gray-700 my-1" />
      <div className="text-[10px] text-gray-500 px-2 py-0.5 font-semibold uppercase">Add Bot</div>
      {BOT_PROFILES.map((profile) => (
        <button
          key={profile.name}
          className="px-2 py-1.5 text-xs text-left rounded hover:bg-emerald-600/20 text-white transition-colors"
          onClick={() => handleAddBot(profile.name)}
        >
          <div className="font-medium">🤖 {profile.name}</div>
        </button>
      ))}
      <button
        className="px-2 py-1 text-xs text-gray-400 hover:text-white border-t border-gray-700 mt-1"
        onClick={() => setOpen(false)}
      >
        Cancel
      </button>
    </motion.div>
  );
}

// ============================================================
// PokerTableWS Component
// ============================================================

interface PokerTableWSProps {
  tableId: string;
  playerId?: string;
}

export function PokerTableWS({ tableId, playerId = 'human-1' }: PokerTableWSProps) {
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const prevHandRef = useRef(0);

  // WebSocket connection with polling fallback
  const { 
    state: gameState, 
    connectionState, 
    sendAction,
    reconnect,
    latency,
  } = useGameWebSocket({
    gameId: tableId,
    playerId,
    enabled: true,
  });

  // Show winner overlay on hand completion
  useEffect(() => {
    if (gameState?.winners?.length && gameState.handNumber !== prevHandRef.current) {
      setShowWinnerOverlay(true);
      prevHandRef.current = gameState.handNumber;
      const timer = setTimeout(() => setShowWinnerOverlay(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.winners, gameState?.handNumber]);

  // Sound effects
  useGameSounds(gameState);

  // Submit action (via WebSocket or REST fallback)
  const handleAction = useCallback(
    (action: PlayerAction) => {
      playActionSound(action.type);
      sendAction(action);
    },
    [sendAction]
  );

  // Debug handlers (REST only - not real-time)
  const handleUpdateBot = useCallback(
    async (botId: string, field: string, value: string | number) => {
      await fetch(`/api/v1/table/${tableId}/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'update_bot', botId, field, value }),
      });
      // State will update via WebSocket
    },
    [tableId]
  );

  const handleResetGame = useCallback(async () => {
    await fetch(`/api/v1/table/${tableId}/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'reset' }),
    });
    // State will update via WebSocket
  }, [tableId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (!gameState) return;

      const myPlayer = gameState.players.find((p) => p.seat === gameState.mySeat);
      const isMyTurn = myPlayer?.isActive && gameState.validActions.length > 0;
      if (!isMyTurn) return;

      const key = e.key.toLowerCase();
      if (key === 'f') handleAction({ type: 'fold' });
      else if (key === 'c') {
        const action = gameState.validActions.find((a) => a.type === 'check' || a.type === 'call');
        if (action) handleAction({ type: action.type });
      } else if (key === 'r') {
        const action = gameState.validActions.find((a) => a.type === 'raise' || a.type === 'bet');
        if (action) handleAction({ type: action.type, amount: action.minAmount });
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleAction]);

  // Loading state
  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div
            className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-400">
            {connectionState === 'connecting' ? 'Connecting via WebSocket...' : 'Loading game state...'}
          </p>
          <ConnectionStatus state={connectionState} latency={latency} onReconnect={reconnect} />
        </motion.div>
      </div>
    );
  }

  const myPlayer = gameState.players.find((p) => p.seat === gameState.mySeat);
  const isMyTurn = myPlayer?.isActive && gameState.validActions.length > 0;
  const winnerSeats = new Set(gameState.winners?.map((w) => w.seat) ?? []);
  const totalPot = gameState.pots.reduce((sum, p) => sum + p.amount, 0);

  const winnerData = (gameState.winners ?? []).map((w) => ({
    ...w,
    playerName: gameState.players.find((p) => p.seat === w.seat)?.name ?? 'Unknown',
  }));

  return (
    <div className="relative w-full h-screen bg-gray-950 overflow-hidden select-none">
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
          <ConnectionStatus state={connectionState} latency={latency} onReconnect={reconnect} />
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Blinds: ${gameState.smallBlind}/${gameState.bigBlind}</span>
          <span className="text-gray-600">|</span>
          <SoundToggle />
          <span className="text-gray-600">|</span>
          <motion.span
            className={`capitalize ${gameState.phase === 'showdown' ? 'text-yellow-400' : 'text-emerald-400'}`}
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
            <CommunityCards cards={gameState.communityCards} handNumber={gameState.handNumber} />
            <PotDisplay amount={totalPot} />

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

          {/* Player seats (occupied + empty) */}
          {Array.from({ length: gameState.maxPlayers }, (_, seat) => {
            const player = gameState.players.find(p => p.seat === seat);
            if (player) {
              return (
                <div key={seat} className="absolute" style={getSeatPosition(gameState.maxPlayers, seat)}>
                  <PlayerSeat
                    player={player}
                    isDealer={player.seat === gameState.dealerSeat}
                    isHero={player.seat === gameState.mySeat}
                    heroCards={player.seat === gameState.mySeat ? gameState.myCards : undefined}
                    isWinner={winnerSeats.has(player.seat)}
                    handNumber={gameState.handNumber}
                  />
                </div>
              );
            }
            return (
              <div key={seat} className="absolute" style={getSeatPosition(gameState.maxPlayers, seat)}>
                <EmptySeatMenu
                  seat={seat}
                  tableId={tableId}
                  playerId={playerId}
                  onAction={() => {/* state updates via WS */}}
                />
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Hero's enlarged cards */}
      <AnimatePresence>
        {gameState.myCards.length > 0 && (
          <motion.div
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <HoleCards cards={gameState.myCards} size="lg" animate handNumber={gameState.handNumber} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Showdown results */}
      <AnimatePresence>
        {gameState.showdownHands?.length && (
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
                  <span className={`font-medium ${isWinner ? 'text-yellow-300' : 'text-gray-300'}`}>{p?.name}:</span>
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
            <motion.div key="action" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <ActionPanel
                validActions={gameState.validActions}
                onAction={handleAction}
                currentBet={gameState.currentBet}
                myBet={myPlayer?.currentBet ?? 0}
                bigBlind={gameState.bigBlind}
              />
            </motion.div>
          ) : (
            <motion.div key="waiting" className="text-gray-600 text-sm py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {gameState.phase === 'showdown' ? '' : 'Waiting for other players...'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DebugPanel gameState={gameState} onUpdateBot={handleUpdateBot} onResetGame={handleResetGame} />

      <ChatPanel
        tableId={tableId}
        playerId={gameState?.players?.[0]?.id ?? 'player-0'}
        playerName={gameState?.players?.[0]?.name ?? 'Player'}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(o => !o)}
      />
    </div>
  );
}

export default PokerTableWS;
