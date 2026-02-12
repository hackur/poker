'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  rating: number;
  weeklyChange?: number;
  totalWins: number;
  totalWinnings: number;
  badgeCount: number;
}

type Period = 'all-time' | 'weekly';

export default function RankingsPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [period, setPeriod] = useState<Period>('all-time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/rankings?period=${period}&limit=50`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-gray-500 hover:text-[#14b8a6] text-sm mb-2 inline-block">← Back</Link>
            <h1 className="text-3xl font-bold">🏆 Leaderboard</h1>
            <p className="text-gray-500 text-sm mt-1">{total} players ranked</p>
          </div>
          <div className="flex gap-2">
            {(['all-time', 'weekly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-[#14b8a6] text-white'
                    : 'bg-[#252525] text-gray-400 hover:text-white border border-[#333]'
                }`}
              >
                {p === 'all-time' ? 'All Time' : 'This Week'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 animate-pulse text-center py-20">Loading rankings…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-500 text-lg">No rankings yet</div>
            <p className="text-gray-600 text-sm mt-2">Play some hands to get on the leaderboard!</p>
          </div>
        ) : (
          <div className="bg-[#252525] rounded-xl border border-[#333] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase border-b border-[#333]">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-right">ELO</th>
                  <th className="px-4 py-3 text-right">Week</th>
                  <th className="px-4 py-3 text-right">Wins</th>
                  <th className="px-4 py-3 text-right">Winnings</th>
                  <th className="px-4 py-3 text-right">🏅</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.playerId} className="border-b border-[#333]/50 hover:bg-[#2a2a2a] transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono">
                      {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/profile/${e.playerId}`} className="text-white hover:text-[#14b8a6] font-medium">
                        {e.playerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">{e.rating}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {e.weeklyChange !== undefined && e.weeklyChange !== 0 && (
                        <span className={e.weeklyChange > 0 ? 'text-[#14b8a6]' : 'text-red-400'}>
                          {e.weeklyChange > 0 ? '+' : ''}{e.weeklyChange}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{e.totalWins}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{e.totalWinnings.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{e.badgeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
