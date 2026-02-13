export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getCurrentUser, getAllUsers } from '@/lib/auth-kv';
import { getHandHistory } from '@/lib/hand-history';
import { getAllPlayerStats } from '@/lib/player-stats';
import { listTables } from '@/lib/table-store';
import { getGameManagerV2 } from '@/lib/game-manager-v2';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const users = await getAllUsers();
  const history = getHandHistory();
  const stats = getAllPlayerStats();
  const tables = listTables();
  const gm = getGameManagerV2();
  const activeGames = gm.listGames();

  // Aggregate stats
  const totalPot = history.reduce((sum, h) => sum + h.pot, 0);
  const biggestPot = history.reduce((max, h) => Math.max(max, h.pot), 0);
  const totalPlayers = tables.reduce((sum, t) => sum + t.playerCount, 0);

  // Recent hands (last 20)
  const recentHands = history.slice(-20).reverse().map(h => ({
    handNumber: h.handNumber,
    gameId: h.gameId,
    pot: h.pot,
    winners: h.winners,
    playerCount: h.players.length,
    timestamp: h.timestamp,
  }));

  // Player stats summary
  const playerSummaries = stats.map(s => ({
    playerId: s.playerId,
    playerName: s.playerName,
    handsPlayed: s.handsPlayed,
    handsWon: s.handsWon,
    biggestPot: s.biggestPot,
    netProfit: s.totalChipsWon - s.totalChipsLost,
    lastUpdated: s.lastUpdated,
  }));

  return NextResponse.json({
    overview: {
      activeTables: tables.length,
      activeGames: activeGames.length,
      totalPlayers,
      registeredUsers: users.length,
      handsPlayed: history.length,
      totalPot,
      biggestPot,
    },
    tables: tables.map(t => ({
      ...t,
      game: activeGames.find(g => g.id === t.id),
    })),
    activeGames,
    recentHands,
    playerStats: playerSummaries,
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      balance: u.balance,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    })),
    system: {
      uptime: process.uptime ? process.uptime() : 0,
      memoryUsage: typeof process.memoryUsage === 'function' ? process.memoryUsage() : null,
      timestamp: Date.now(),
    },
  });
}
