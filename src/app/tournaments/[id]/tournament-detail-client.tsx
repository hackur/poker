'use client';


/**
 * Phase 12: Tournament Details + Bracket View
 * /tournaments/[id]
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import BracketView from '@/components/bracket-view';

interface TournamentState {
  config: any;
  status: string;
  players: { id: string; name: string; chips?: number }[];
  eliminatedPlayers: string[];
  tableAssignments: { tableId: string; seat: number; playerId: string }[];
  bracket: any;
  blindManager: {
    currentLevel: { smallBlind: number; bigBlind: number; ante: number; level: number };
    nextLevel: { smallBlind: number; bigBlind: number; ante: number } | null;
    timeRemainingMs: number;
    isPaused: boolean;
  } | null;
  prizePool: number;
  payouts: { place: number; percentage: number; amount: number }[];
  leaderboard: { playerId: string; playerName: string; place: number; payout: number }[];
  startedAt: number | null;
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [error, setError] = useState('');

  const fetchTournament = async () => {
    try {
      const res = await fetch(`/api/v1/tournaments/${id}`);
      if (!res.ok) { setError('Tournament not found'); return; }
      const data = await res.json();
      setTournament(data.tournament);
    } catch { setError('Failed to load'); }
  };

  useEffect(() => {
    fetchTournament();
    const interval = setInterval(fetchTournament, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const doAction = async (action: string, extra: Record<string, any> = {}) => {
    await fetch(`/api/v1/tournaments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    fetchTournament();
  };

  if (error) return <div className="min-h-screen bg-gray-900 text-red-400 flex items-center justify-center text-xl">{error}</div>;
  if (!tournament) return <div className="min-h-screen bg-gray-900 text-gray-400 flex items-center justify-center">Loading...</div>;

  const t = tournament;
  const playerNames = Object.fromEntries(t.players.map((p) => [p.id, p.name]));
  const activeTables = [...new Set(
    t.tableAssignments
      .filter((a) => !t.eliminatedPlayers.includes(a.playerId))
      .map((a) => a.tableId)
  )];

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/tournaments" className="text-blue-400 hover:underline text-sm mb-4 block">← Back to Tournaments</Link>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t.config.name}</h1>
            <p className="text-gray-400">
              {t.config.type} • ${t.config.buyIn} buy-in • {t.players.length}/{t.config.maxPlayers} players
            </p>
          </div>
          <div className="flex gap-2">
            {t.status === 'registering' && (
              <button onClick={() => doAction('start')} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">
                Start Tournament
              </button>
            )}
            {t.status === 'active' && (
              <button onClick={() => doAction('pause')} className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded font-bold">
                Pause
              </button>
            )}
            {t.status === 'paused' && (
              <button onClick={() => doAction('resume')} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">
                Resume
              </button>
            )}
            {(t.status === 'active' || t.status === 'paused') && (
              <button onClick={() => doAction('cancel')} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Blind Info */}
        {t.blindManager && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center gap-8">
            <div>
              <div className="text-xs text-gray-400">Current Blinds</div>
              <div className="text-2xl font-bold text-yellow-400">
                {t.blindManager.currentLevel.smallBlind}/{t.blindManager.currentLevel.bigBlind}
                {t.blindManager.currentLevel.ante > 0 && (
                  <span className="text-sm text-gray-400 ml-2">ante {t.blindManager.currentLevel.ante}</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Time Left</div>
              <div className="text-2xl font-mono">{formatTime(t.blindManager.timeRemainingMs)}</div>
            </div>
            {t.blindManager.nextLevel && (
              <div>
                <div className="text-xs text-gray-400">Next Level</div>
                <div className="text-lg text-gray-300">
                  {t.blindManager.nextLevel.smallBlind}/{t.blindManager.nextLevel.bigBlind}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-400">Level</div>
              <div className="text-lg">{t.blindManager.currentLevel.level}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tables */}
          <div className="lg:col-span-2 space-y-4">
            {t.status === 'active' && activeTables.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">🃏 Tables ({activeTables.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTables.map((tableId) => {
                    const players = t.tableAssignments
                      .filter((a) => a.tableId === tableId && !t.eliminatedPlayers.includes(a.playerId));
                    return (
                      <Link
                        key={tableId}
                        href={`/tournaments/${id}/table/${tableId}`}
                        className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                      >
                        <h3 className="font-bold text-lg mb-2">{tableId}</h3>
                        <div className="space-y-1">
                          {players.map((p) => (
                            <div key={p.playerId} className="text-sm text-gray-300 flex justify-between">
                              <span>Seat {p.seat + 1}: {playerNames[p.playerId] || p.playerId.slice(0, 8)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">{players.length} players</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bracket */}
            {t.bracket && (
              <div>
                <h2 className="text-xl font-bold mb-4">📊 Bracket</h2>
                <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                  <BracketView bracket={t.bracket} playerNames={playerNames} />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Prize Pool & Payouts */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">💰 Prize Pool: ${t.prizePool}</h3>
              <div className="space-y-1">
                {t.payouts.map((p) => (
                  <div key={p.place} className="flex justify-between text-sm">
                    <span className="text-gray-400">{p.place}{getOrd(p.place)} Place</span>
                    <span className="text-green-400">${p.amount.toFixed(2)} ({p.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Players */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">👥 Players ({t.players.length})</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {t.players.map((p) => (
                  <div key={p.id} className={`text-sm flex justify-between ${
                    t.eliminatedPlayers.includes(p.id) ? 'text-gray-600 line-through' : 'text-gray-300'
                  }`}>
                    <span>{p.name}</span>
                    {p.chips !== undefined && <span>{p.chips.toLocaleString()}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard (when complete) */}
            {t.status === 'complete' && t.leaderboard.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">🏆 Final Standings</h3>
                <div className="space-y-1">
                  {t.leaderboard.slice(0, 10).map((entry) => (
                    <div key={entry.playerId} className="flex justify-between text-sm">
                      <span className={entry.place <= 3 ? 'text-yellow-400 font-bold' : 'text-gray-300'}>
                        #{entry.place} {entry.playerName}
                      </span>
                      {entry.payout > 0 && (
                        <span className="text-green-400">${entry.payout.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getOrd(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
