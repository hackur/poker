'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface PositionStats {
  hands: number;
  wins: number;
}

interface SessionRecord {
  gameId: string;
  handNumber: number;
  timestamp: number;
  result: number;
  handName?: string;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  handsPlayed: number;
  handsWon: number;
  biggestPot: number;
  totalChipsWon: number;
  totalChipsLost: number;
  positionStats: Record<string, PositionStats>;
  sessions: SessionRecord[];
  lastUpdated: number;
}

// ── Sparkline component (pure SVG, no deps) ──
function Sparkline({ data, width = 280, height = 60 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  const lastVal = data[data.length - 1];
  const color = lastVal >= 0 ? '#14b8a6' : '#ef4444';

  return (
    <svg width={width} height={height} className="mt-2">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      {/* zero line */}
      {min < 0 && max > 0 && (
        <line
          x1={0} x2={width}
          y1={height - ((0 - min) / range) * (height - 8) - 4}
          y2={height - ((0 - min) / range) * (height - 8) - 4}
          stroke="#555" strokeWidth="1" strokeDasharray="4,4"
        />
      )}
    </svg>
  );
}

// ── Stat card ──
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#252525] rounded-xl p-5 border border-[#333]">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/players/${encodeURIComponent(playerId)}/stats`)
      .then(r => {
        if (!r.ok) throw new Error('Player not found');
        return r.json();
      })
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Loading profile…</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-lg">{error ?? 'No stats available'}</div>
        <div className="text-gray-500 text-sm">Play some hands first, then check back!</div>
        <Link href="/" className="text-[#14b8a6] hover:underline text-sm">← Back to lobby</Link>
      </div>
    );
  }

  const winRate = stats.handsPlayed > 0 ? ((stats.handsWon / stats.handsPlayed) * 100).toFixed(1) : '0.0';
  const netChips = stats.totalChipsWon - stats.totalChipsLost;

  // Build cumulative P&L for sparkline
  const cumulative: number[] = [];
  const reversedSessions = [...stats.sessions].reverse();
  let running = 0;
  for (const s of reversedSessions) {
    running += s.result;
    cumulative.push(running);
  }

  // Position stats sorted by hands
  const positions = Object.entries(stats.positionStats)
    .sort((a, b) => b[1].hands - a[1].hands);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-gray-500 hover:text-[#14b8a6] text-sm mb-2 inline-block">← Back</Link>
            <h1 className="text-3xl font-bold">
              {stats.playerName}
              {stats.playerId.startsWith('bot-') || stats.playerId.includes('bot') ? (
                <span className="ml-2 text-sm bg-[#14b8a6]/20 text-[#14b8a6] px-2 py-0.5 rounded">🤖 Bot</span>
              ) : (
                <span className="ml-2 text-sm bg-[#14b8a6]/20 text-[#14b8a6] px-2 py-0.5 rounded">👤 Human</span>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-1">ID: {stats.playerId}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Last active</div>
            <div className="text-gray-300">{new Date(stats.lastUpdated).toLocaleString()}</div>
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Hands Played" value={stats.handsPlayed} />
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${stats.handsWon} wins`} />
          <StatCard label="Biggest Pot" value={stats.biggestPot.toLocaleString()} sub="chips" />
          <StatCard
            label="Net Chips"
            value={`${netChips >= 0 ? '+' : ''}${netChips.toLocaleString()}`}
            sub={`Won ${stats.totalChipsWon.toLocaleString()} / Lost ${stats.totalChipsLost.toLocaleString()}`}
          />
        </div>

        {/* P&L Chart */}
        {cumulative.length > 1 && (
          <div className="bg-[#252525] rounded-xl p-5 border border-[#333] mb-8">
            <h2 className="text-lg font-semibold mb-2">Profit & Loss</h2>
            <p className="text-sm text-gray-500 mb-2">Cumulative chips over {cumulative.length} hands</p>
            <Sparkline data={cumulative} width={700} height={100} />
          </div>
        )}

        {/* Position Stats */}
        {positions.length > 0 && (
          <div className="bg-[#252525] rounded-xl p-5 border border-[#333] mb-8">
            <h2 className="text-lg font-semibold mb-4">Position Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {positions.map(([pos, data]) => (
                <div key={pos} className="bg-[#1a1a1a] rounded-lg p-3">
                  <div className="text-[#14b8a6] font-mono font-bold uppercase text-sm">{pos}</div>
                  <div className="text-white text-lg">{data.hands > 0 ? ((data.wins / data.hands) * 100).toFixed(0) : 0}%</div>
                  <div className="text-gray-500 text-xs">{data.wins}W / {data.hands} hands</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Hands */}
        <div className="bg-[#252525] rounded-xl p-5 border border-[#333]">
          <h2 className="text-lg font-semibold mb-4">Recent Hands</h2>
          {stats.sessions.length === 0 ? (
            <p className="text-gray-500">No hands recorded yet</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {stats.sessions.slice(0, 50).map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded hover:bg-[#1a1a1a] text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-mono w-8">#{s.handNumber}</span>
                    {s.handName && <span className="text-gray-400">{s.handName}</span>}
                  </div>
                  <span className={`font-mono font-bold ${s.result >= 0 ? 'text-[#14b8a6]' : 'text-red-400'}`}>
                    {s.result >= 0 ? '+' : ''}{s.result}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
