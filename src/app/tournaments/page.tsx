'use client';

/**
 * Phase 12: Tournament List + Create Form
 * /tournaments
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TournamentSummary {
  config: {
    id: string;
    name: string;
    type: string;
    buyIn: number;
    maxPlayers: number;
    blindSchedule: string;
  };
  status: string;
  players: { id: string }[];
  prizePool: number;
  startedAt: number | null;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'sit-and-go',
    buyIn: 100,
    maxPlayers: 18,
    minPlayers: 2,
    startingChips: 10000,
    blindSchedule: 'standard',
    seatingMethod: 'snake',
    payoutStructure: 'standard',
    allowRebuys: false,
    allowAddOn: false,
  });

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/v1/tournaments');
      const data = await res.json();
      setTournaments(data.tournaments || []);
    } catch {}
  };

  useEffect(() => { fetchTournaments(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/v1/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      fetchTournaments();
    } catch {}
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-600',
      registering: 'bg-blue-600',
      active: 'bg-green-600',
      paused: 'bg-yellow-600',
      complete: 'bg-purple-600',
      cancelled: 'bg-red-600',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status] || 'bg-gray-500'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">🏆 Tournaments</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
          >
            + Create Tournament
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-gray-800 rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold mb-4">New Tournament</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                >
                  <option value="sit-and-go">Sit & Go</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="single-elimination">Single Elimination</option>
                  <option value="double-elimination">Double Elimination</option>
                  <option value="round-robin">Round Robin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Buy-In ($)</label>
                <input
                  type="number"
                  value={form.buyIn}
                  onChange={(e) => setForm({ ...form, buyIn: +e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Players</label>
                <input
                  type="number"
                  value={form.maxPlayers}
                  onChange={(e) => setForm({ ...form, maxPlayers: +e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Starting Chips</label>
                <input
                  type="number"
                  value={form.startingChips}
                  onChange={(e) => setForm({ ...form, startingChips: +e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Blind Schedule</label>
                <select
                  value={form.blindSchedule}
                  onChange={(e) => setForm({ ...form, blindSchedule: e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                >
                  <option value="turbo">Turbo (5 min/level)</option>
                  <option value="standard">Standard (15 min/level)</option>
                  <option value="deep-stack">Deep Stack (20 min/level)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Seating</label>
                <select
                  value={form.seatingMethod}
                  onChange={(e) => setForm({ ...form, seatingMethod: e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                >
                  <option value="snake">Snake (ELO-balanced)</option>
                  <option value="random">Random</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Payout Structure</label>
                <select
                  value={form.payoutStructure}
                  onChange={(e) => setForm({ ...form, payoutStructure: e.target.value })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                >
                  <option value="standard">Standard</option>
                  <option value="top-heavy">Top Heavy</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.allowRebuys}
                    onChange={(e) => setForm({ ...form, allowRebuys: e.target.checked })}
                  />
                  <span className="text-sm">Allow Rebuys</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.allowAddOn}
                    onChange={(e) => setForm({ ...form, allowAddOn: e.target.checked })}
                  />
                  <span className="text-sm">Allow Add-on</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button type="submit" className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold">
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {tournaments.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-xl">No tournaments yet</p>
            <p className="text-sm mt-2">Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map((t) => (
              <Link
                key={t.config.id}
                href={`/tournaments/${t.config.id}`}
                className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{t.config.name}</h3>
                    <p className="text-sm text-gray-400">
                      {t.config.type} • ${t.config.buyIn} buy-in • {t.config.blindSchedule} blinds
                    </p>
                  </div>
                  <div className="text-right">
                    {statusBadge(t.status)}
                    <p className="text-sm text-gray-400 mt-1">
                      {t.players.length}/{t.config.maxPlayers} players
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                  <span>Prize Pool: ${t.prizePool}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
