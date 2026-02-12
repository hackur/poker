'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerGameView, PlayerAction } from '@/lib/poker/types';
import { PlayerSeat } from './player-seat';
import { CommunityCards, HoleCards } from './card';
import { PotDisplay } from './chip-stack';
import { MobileControls } from './mobile-controls';
import { WinnerOverlay } from './winner-overlay';
import { SoundToggle } from './sound-toggle';
import { useGameSounds, playActionSound } from '@/lib/audio/use-game-sounds';
import { useGestureDetector } from '@/hooks/useGestureDetector';
import { useResponsive, type DeviceType } from '@/hooks/useMediaQuery';

// ============================================================
// Mobile Seat Positions — Optimized for small screens
// ============================================================

const MOBILE_SEATS: Record<number, Record<number, React.CSSProperties>> = {
  2: {
    0: { bottom: '22%', left: '50%', transform: 'translateX(-50%)' },
    1: { top: '8%', left: '50%', transform: 'translateX(-50%)' },
  },
  6: {
    0: { bottom: '18%', left: '50%', transform: 'translateX(-50%)' },
    1: { bottom: '45%', left: '2%' },
    2: { top: '12%', left: '8%' },
    3: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
    4: { top: '12%', right: '8%' },
    5: { bottom: '45%', right: '2%' },
  },
};

const TABLET_SEATS: Record<number, Record<number, React.CSSProperties>> = {
  2: {
    0: { bottom: '8%', left: '50%', transform: 'translateX(-50%)' },
    1: { top: '6%', left: '50%', transform: 'translateX(-50%)' },
  },
  6: {
    0: { bottom: '6%', left: '50%', transform: 'translateX(-50%)' },
    1: { bottom: '35%', left: '3%' },
    2: { top: '10%', left: '12%' },
    3: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
    4: { top: '10%', right: '12%' },
    5: { bottom: '35%', right: '3%' },
  },
};

function getMobileSeatPosition(device: DeviceType, playerCount: number, seat: number): React.CSSProperties {
  const layouts = device === 'mobile' ? MOBILE_SEATS : TABLET_SEATS;
  const layout = playerCount <= 2 ? layouts[2] : layouts[6];
  return layout[seat] ?? {};
}

// ============================================================
// MobilePokerTable Component
// ============================================================

interface MobilePokerTableProps {
  tableId: string;
}

export function MobilePokerTable({ tableId }: MobilePokerTableProps) {
  const [gameState, setGameState] = useState<PlayerGameView | null>(null);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevHandRef = useRef(0);
  const { device, isMobile, isLandscape, isTouch } = useResponsive();

  // Poll for game state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/table/${tableId}`);
      if (res.ok) setGameState(await res.json());
    } catch { /* retry */ }
  }, [tableId]);

  useEffect(() => {
    fetchState();
    pollingRef.current = setInterval(fetchState, 1000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchState]);

  // Winner overlay
  useEffect(() => {
    if (gameState?.winners?.length && gameState.handNumber !== prevHandRef.current) {
      setShowWinnerOverlay(true);
      prevHandRef.current = gameState.handNumber;
      const timer = setTimeout(() => setShowWinnerOverlay(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.winners, gameState?.handNumber]);

  useGameSounds(gameState);

  // Submit action
  const handleAction = useCallback(async (action: PlayerAction) => {
    playActionSound(action.type);
    try {
      const res = await fetch(`/api/v1/table/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) setGameState(await res.json());
    } catch { /* noop */ }
  }, [tableId]);

  // Gesture detection for table area
  const myPlayer = gameState?.players.find((p) => p.seat === gameState.mySeat);
  const isMyTurn = myPlayer?.isActive && (gameState?.validActions?.length ?? 0) > 0;

  const gestureHandlers = useGestureDetector(
    {
      onSwipeLeft: () => {
        if (isMyTurn) handleAction({ type: 'fold' });
      },
      onTap: () => {
        if (!isMyTurn || !gameState) return;
        const checkOrCall = gameState.validActions.find(
          (a) => a.type === 'check' || a.type === 'call'
        );
        if (checkOrCall) handleAction({ type: checkOrCall.type });
      },
      onDoubleTap: () => {
        if (isMyTurn && gameState?.validActions.some((a) => a.type === 'all_in')) {
          handleAction({ type: 'all_in' });
        }
      },
      // Long press is handled by MobileControls raise slider
    },
    isTouch && !!isMyTurn
  );

  // Loading
  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-950 text-white">
        <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div
            className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-400 text-sm">Connecting...</p>
        </motion.div>
      </div>
    );
  }

  const winnerSeats = new Set(gameState.winners?.map((w) => w.seat) ?? []);
  const totalPot = gameState.pots.reduce((sum, p) => sum + p.amount, 0);
  const winnerData = (gameState.winners ?? []).map((w) => ({
    ...w,
    playerName: gameState.players.find((p) => p.seat === w.seat)?.name ?? 'Unknown',
  }));

  const cardSize = isMobile ? 'sm' : 'md';
  const heroCardSize = isMobile ? 'md' : 'lg';

  return (
    <div
      className="poker-table-container relative w-full h-dvh bg-gray-950 overflow-hidden select-none no-select"
      {...gestureHandlers}
    >
      <WinnerOverlay winners={winnerData} show={showWinnerOverlay} />

      {/* Compact Header */}
      <div className="poker-header absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2">
        {/* Hamburger menu (mobile only) */}
        <div className="flex items-center gap-2">
          <button
            className="mobile-nav items-center justify-center w-8 h-8 text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1" />
              <rect y="9" width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-sm desktop-nav">♠ Poker</h1>
          <span className="text-gray-500 text-xs">#{gameState.handNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>${gameState.smallBlind}/{gameState.bigBlind}</span>
          <SoundToggle />
          <span className={`capitalize text-xs ${gameState.phase === 'showdown' ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {gameState.phase}
          </span>
        </div>
      </div>

      {/* Mobile hamburger menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 p-6 space-y-4"
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-white font-bold text-lg mb-6">♠ Poker</h2>
              <a href="/" className="block text-gray-300 py-3 border-b border-gray-800" style={{ minHeight: '44px' }}>
                Lobby
              </a>
              <a href="/profile" className="block text-gray-300 py-3 border-b border-gray-800" style={{ minHeight: '44px' }}>
                Profile
              </a>
              <div className="text-gray-500 text-xs pt-4">
                Hand #{gameState.handNumber} • Blinds ${gameState.smallBlind}/${gameState.bigBlind}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table felt */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className={`poker-felt relative ${isMobile && !isLandscape ? 'w-[95%] aspect-[4/3]' : 'w-[85%] max-w-[900px] aspect-[16/10]'}`}
          style={{
            background: 'radial-gradient(ellipse at center, #1a6b3c 0%, #0d5c2e 50%, #0a4423 100%)',
            borderRadius: '50%',
            border: isMobile ? '4px solid #2a1a0a' : '8px solid #2a1a0a',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.6)',
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {!isMobile && (
            <div
              className="absolute inset-[-12px] rounded-[50%]"
              style={{ border: '4px solid #3d2b1f', background: 'transparent' }}
            />
          )}

          {/* Community cards + pot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="community-cards">
              <CommunityCards cards={gameState.communityCards} handNumber={gameState.handNumber} />
            </div>
            <div className="pot-display">
              <PotDisplay amount={totalPot} />
            </div>

            <AnimatePresence mode="wait">
              {gameState.phase === 'waiting' && (
                <motion.div
                  key="waiting"
                  className="bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Waiting...
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player seats */}
          {gameState.players.map((player) => (
            <div
              key={player.seat}
              className="absolute player-seat"
              style={getMobileSeatPosition(device, gameState.players.length, player.seat)}
            >
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

      {/* Hero cards */}
      <AnimatePresence>
        {gameState.myCards.length > 0 && (
          <motion.div
            className={`hero-cards absolute left-1/2 -translate-x-1/2 z-10 ${isMobile ? 'bottom-[120px]' : 'bottom-28'}`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <HoleCards cards={gameState.myCards} size={heroCardSize} animate handNumber={gameState.handNumber} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Showdown results */}
      <AnimatePresence>
        {gameState.showdownHands?.length && (
          <motion.div
            className={`showdown-results absolute z-10 bg-black/70 rounded-xl p-2 text-xs text-white space-y-1 ${
              isMobile ? 'bottom-[120px] left-1/2 -translate-x-1/2 max-w-[90%]' : 'bottom-28 right-4'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="font-bold text-yellow-400 mb-1 text-center">Showdown</div>
            {gameState.showdownHands.map((sh) => {
              const p = gameState.players.find((pl) => pl.seat === sh.seat);
              const isWinner = winnerSeats.has(sh.seat);
              return (
                <div key={sh.seat} className="flex items-center gap-1 justify-center">
                  <span className={isWinner ? 'text-yellow-300' : 'text-gray-300'}>{p?.name}:</span>
                  <span className="text-emerald-300">{sh.handName}</span>
                  {isWinner && <span>🏆</span>}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action panel — mobile vs desktop */}
      <div className="action-panel absolute bottom-0 left-0 right-0 z-20">
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.div key="action" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <MobileControls
                validActions={gameState.validActions}
                onAction={handleAction}
                currentBet={gameState.currentBet}
                myBet={myPlayer?.currentBet ?? 0}
                bigBlind={gameState.bigBlind}
              />
            </motion.div>
          ) : (
            <motion.div key="waiting" className="text-gray-600 text-xs py-3 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {gameState.phase === 'showdown' ? '' : 'Waiting...'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
