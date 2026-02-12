'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================
// Types
// ============================================================

interface TableView {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: number;
  playerCount: number;
  players: { id: string; displayName: string; seat: number }[];
  status: 'waiting' | 'playing' | 'full';
  createdAt: number;
}

interface UserInfo {
  id: string;
  displayName: string;
  balance: number;
  role: string;
}

// ============================================================
// Create Table Modal
// ============================================================

function CreateTableModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [minBuyIn, setMinBuyIn] = useState(100);
  const [maxBuyIn, setMaxBuyIn] = useState(1000);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, smallBlind, bigBlind, minBuyIn, maxBuyIn, maxPlayers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create table');
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-5">Create Table</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Table Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Cash Game"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#14b8a6] focus:outline-none"
              required
            />
          </div>

          {/* Blinds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Small Blind ($)</label>
              <input
                type="number"
                value={smallBlind}
                onChange={e => setSmallBlind(Number(e.target.value))}
                min={1}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#14b8a6] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Big Blind ($)</label>
              <input
                type="number"
                value={bigBlind}
                onChange={e => setBigBlind(Number(e.target.value))}
                min={1}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#14b8a6] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Buy-in Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Min Buy-in ($)</label>
              <input
                type="number"
                value={minBuyIn}
                onChange={e => setMinBuyIn(Number(e.target.value))}
                min={1}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#14b8a6] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Max Buy-in ($)</label>
              <input
                type="number"
                value={maxBuyIn}
                onChange={e => setMaxBuyIn(Number(e.target.value))}
                min={1}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#14b8a6] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Max Players */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Max Players</label>
            <select
              value={maxPlayers}
              onChange={e => setMaxPlayers(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#14b8a6] focus:outline-none"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <option key={n} value={n}>{n} players{n === 2 ? ' (Heads-up)' : n === 6 ? ' (6-max)' : n === 9 ? ' (Full ring)' : ''}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 text-gray-400 py-2.5 rounded-lg text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#14b8a6] hover:bg-[#0d9488] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Join Table Modal
// ============================================================

function JoinTableModal({ table, onClose, onJoined }: { table: TableView; onClose: () => void; onJoined: () => void }) {
  const [buyIn, setBuyIn] = useState(table.minBuyIn);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/tables/${table.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'human-1', displayName: 'You', buyIn }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to join');
        return;
      }
      onJoined();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-1">Join {table.name}</h2>
        <p className="text-gray-500 text-sm mb-5">${table.smallBlind}/${table.bigBlind} · {table.playerCount}/{table.maxPlayers} players</p>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Buy-in (${table.minBuyIn} – ${table.maxBuyIn})
            </label>
            <input
              type="number"
              value={buyIn}
              onChange={e => setBuyIn(Number(e.target.value))}
              min={table.minBuyIn}
              max={table.maxBuyIn}
              step={table.bigBlind}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#14b8a6] focus:outline-none"
            />
            <input
              type="range"
              value={buyIn}
              onChange={e => setBuyIn(Number(e.target.value))}
              min={table.minBuyIn}
              max={table.maxBuyIn}
              step={table.bigBlind}
              className="w-full mt-2 accent-[#14b8a6]"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-800 text-gray-400 py-2.5 rounded-lg text-sm hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 bg-[#14b8a6] hover:bg-[#0d9488] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
              {submitting ? 'Joining...' : `Sit Down ($${buyIn})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Status Badge
// ============================================================

function StatusBadge({ status }: { status: TableView['status'] }) {
  const styles = {
    waiting: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
    playing: 'bg-green-900/50 text-green-400 border-green-800',
    full: 'bg-red-900/50 text-red-400 border-red-800',
  };
  const labels = { waiting: 'Waiting', playing: 'Playing', full: 'Full' };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ============================================================
// Lobby Page
// ============================================================

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tables, setTables] = useState<TableView[]>([]);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [joinTarget, setJoinTarget] = useState<TableView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/tables');
      const data = await res.json();
      setTables(data.tables || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/v1/auth/session')
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {});
    fetchTables();
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const filtered = filter === 'all' ? tables
    : filter === 'open' ? tables.filter(t => t.status !== 'full')
    : filter === 'waiting' ? tables.filter(t => t.status === 'waiting')
    : tables;

  const totalPlayers = tables.reduce((s, t) => s + t.playerCount, 0);

  async function handleLeave(tableId: string) {
    await fetch(`/api/v1/tables/${tableId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: 'human-1' }),
    });
    fetchTables();
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-[#1a1a1a]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/lobby" className="text-white font-bold text-lg">♠ Poker</Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/lobby" className="text-[#14b8a6]">Lobby</Link>
              <Link href="/table/demo" className="text-gray-400 hover:text-white transition-colors">Quick Play</Link>
              {user?.role === 'superadmin' && (
                <Link href="/admin" className="text-orange-400 hover:text-orange-300">Admin</Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-yellow-400 text-sm font-mono">${user.balance.toLocaleString()}</span>
                <span className="text-gray-400 text-sm">{user.displayName}</span>
                <button
                  onClick={async () => {
                    await fetch('/api/v1/auth/logout', { method: 'POST' });
                    setUser(null);
                  }}
                  className="text-gray-500 hover:text-white text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-[#14b8a6] hover:bg-[#0d9488] text-white text-sm px-4 py-1.5 rounded-lg transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Cash Game Lobby</h1>
            <p className="text-gray-500 text-sm mt-1">
              {tables.length} table{tables.length !== 1 ? 's' : ''} · {totalPlayers} player{totalPlayers !== 1 ? 's' : ''} seated
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-[#14b8a6] hover:bg-[#0d9488] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            + Create Table
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'All Tables' },
            { key: 'open', label: 'Open Seats' },
            { key: 'waiting', label: 'Waiting' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f.key
                  ? 'bg-[#14b8a6] text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table Grid */}
        {loading ? (
          <div className="text-gray-500 text-center py-20">Loading tables...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-2">No tables yet</p>
            <p className="text-gray-600 text-sm mb-6">Create one to get started!</p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-[#14b8a6] hover:bg-[#0d9488] text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              + Create Table
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(table => {
              const isSeated = table.players.some(p => p.id === 'human-1');
              return (
                <div
                  key={table.id}
                  className="bg-gray-900/60 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold group-hover:text-[#14b8a6] transition-colors">
                      {table.name}
                    </h3>
                    <StatusBadge status={table.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 text-xs">Stakes</span>
                      <div className="text-white font-mono">${table.smallBlind}/${table.bigBlind}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs">Buy-in</span>
                      <div className="text-white font-mono text-xs mt-0.5">${table.minBuyIn}–${table.maxBuyIn}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs">Players</span>
                      <div className="text-white">
                        {table.playerCount}/{table.maxPlayers}
                        {table.status !== 'full' && table.playerCount > 0 && (
                          <span className="text-[#14b8a6] ml-1 text-xs">({table.maxPlayers - table.playerCount} open)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs">Format</span>
                      <div className="text-gray-300 text-xs mt-0.5">
                        {table.maxPlayers === 2 ? 'Heads-up' : table.maxPlayers <= 6 ? `${table.maxPlayers}-max` : 'Full Ring'}
                      </div>
                    </div>
                  </div>

                  {/* Players list */}
                  {table.playerCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="flex flex-wrap gap-1">
                        {table.players.map(p => (
                          <span key={p.id} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                            {p.displayName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 flex gap-2">
                    {isSeated ? (
                      <>
                        <button
                          onClick={() => router.push(`/table/${table.id}`)}
                          className="flex-1 bg-[#14b8a6] hover:bg-[#0d9488] text-white py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Go to Table
                        </button>
                        <button
                          onClick={() => handleLeave(table.id)}
                          className="bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          Leave
                        </button>
                      </>
                    ) : table.status === 'full' ? (
                      <button
                        onClick={() => router.push(`/table/${table.id}`)}
                        className="flex-1 bg-gray-800 text-gray-400 hover:text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Spectate
                      </button>
                    ) : (
                      <button
                        onClick={() => setJoinTarget(table)}
                        className="flex-1 bg-gray-800 hover:bg-[#14b8a6] text-gray-400 hover:text-white py-2 rounded-lg text-sm font-medium transition-all"
                      >
                        Join Table
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickAction title="Quick Play" description="Jump into the demo table with 5 AI opponents" href="/table/demo" icon="⚡" />
          <QuickAction title="Heads Up vs Nemotron" description="1v1 against Nemotron Nano — local AI on M3 Max" href="/table/heads-up-nemotron-local" icon="🧠" />
          <QuickAction title="AI Battle" description="Watch AI models play against each other" href="/table/ai-battle" icon="🤖" />
          <QuickAction title="Practice" description="Low-stakes table to learn the game" href="/table/practice" icon="📚" />
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateTableModal onClose={() => setShowCreate(false)} onCreated={fetchTables} />}
      {joinTarget && <JoinTableModal table={joinTarget} onClose={() => setJoinTarget(null)} onJoined={fetchTables} />}
    </div>
  );
}

function QuickAction({ title, description, href, icon }: { title: string; description: string; href: string; icon: string }) {
  return (
    <Link
      href={href}
      className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 hover:border-[#14b8a6]/50 hover:bg-gray-900/60 transition-colors group"
    >
      <span className="text-2xl">{icon}</span>
      <h3 className="text-white font-semibold mt-2 group-hover:text-[#14b8a6] transition-colors">{title}</h3>
      <p className="text-gray-500 text-sm mt-1">{description}</p>
    </Link>
  );
}
