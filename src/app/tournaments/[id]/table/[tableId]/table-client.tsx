'use client';


/**
 * Phase 12: Tournament Table Play Page
 * /tournaments/[id]/table/[tableId]
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function TournamentTablePage({
  params,
}: {
  params: Promise<{ id: string; tableId: string }>;
}) {
  const { id, tableId } = use(params);
  const [tournament, setTournament] = useState<any>(null);

  useEffect(() => {
    const fetch_ = async () => {
      const res = await fetch(`/api/v1/tournaments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTournament(data.tournament);
      }
    };
    fetch_();
    const interval = setInterval(fetch_, 3000);
    return () => clearInterval(interval);
  }, [id]);

  if (!tournament) return <div className="min-h-screen bg-gray-900 text-gray-400 flex items-center justify-center">Loading...</div>;

  const t = tournament;
  const tablePlayers = t.tableAssignments
    .filter((a: any) => a.tableId === tableId && !t.eliminatedPlayers.includes(a.playerId))
    .map((a: any) => {
      const player = t.players.find((p: any) => p.id === a.playerId);
      return { ...a, name: player?.name || a.playerId, chips: player?.chips || 0 };
    });

  const blinds = t.blindManager?.currentLevel;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href={`/tournaments/${id}`} className="text-blue-400 hover:underline text-sm mb-4 block">
          ← Back to Tournament
        </Link>

        <h1 className="text-2xl font-bold mb-2">{t.config.name}</h1>
        <h2 className="text-xl text-gray-400 mb-6">{tableId}</h2>

        {/* Blinds Bar */}
        {blinds && (
          <div className="bg-gray-800 rounded-lg p-3 mb-6 flex items-center gap-6 text-sm">
            <span className="text-yellow-400 font-bold">
              Blinds: {blinds.smallBlind}/{blinds.bigBlind}
            </span>
            {blinds.ante > 0 && <span className="text-gray-400">Ante: {blinds.ante}</span>}
            <span className="text-gray-400">Level {blinds.level}</span>
          </div>
        )}

        {/* Table Visualization */}
        <div className="relative bg-green-900 rounded-[50%] border-8 border-amber-900 w-full aspect-[2/1] mb-8 flex items-center justify-center">
          <div className="text-green-700 text-lg font-bold">POKER</div>
          {tablePlayers.map((p: any, i: number) => {
            const angle = (i / Math.max(tablePlayers.length, 1)) * 2 * Math.PI - Math.PI / 2;
            const rx = 42;
            const ry = 38;
            const left = 50 + rx * Math.cos(angle);
            const top = 50 + ry * Math.sin(angle);
            return (
              <div
                key={p.playerId}
                className="absolute bg-gray-800 rounded-lg px-3 py-2 text-center transform -translate-x-1/2 -translate-y-1/2 min-w-[100px]"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <div className="text-xs text-gray-400">Seat {p.seat + 1}</div>
                <div className="text-sm font-bold">{p.name}</div>
                <div className="text-xs text-yellow-400">{p.chips.toLocaleString()}</div>
              </div>
            );
          })}
        </div>

        {/* Player List */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-bold mb-2">Seated Players</h3>
          <div className="space-y-2">
            {tablePlayers.map((p: any) => (
              <div key={p.playerId} className="flex justify-between items-center text-sm">
                <span>Seat {p.seat + 1}: {p.name}</span>
                <span className="text-yellow-400">{p.chips.toLocaleString()} chips</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
