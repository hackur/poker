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
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[hsl(var(--card-foreground))] mb-5">Create Table</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[hsl(var(--muted-foreground))] text-sm mb-1">Table Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Cash Game"
              className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg px-3 py-2 text-[hsl(var(--foreground))] text-sm focus:border-[hsl(var(--ring))] focus:outline-none"
              required
            />
          </div>

          {/* Blinds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[hsl(var(--muted-foreground))] text-sm mb-1">Small Blind ($)</label>
              <input
                type="number"
                value={smallBlind}
                onChange={e => setSmallBlind(Number(e.target.value))}
                min={1}
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg px-3 py-2 text-[hsl(var(--foreground))] text-sm focus:border-[hsl(var(--ring))] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[hsl(var(--muted-foreground))] text-sm mb-1">Big Blind ($)</label>
              <input
                type="number"
                value={bigBlind}
                onChange={e => setBigBlind(Number(e.target.value))}
                min={1}
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg px-3 py-2 text-[hsl(var(--foreground))] text-sm focus:border-[hsl(var(--ring))] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Buy-in Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[hsl(var(--muted-foreground))] text-sm mb-1">Min Buy-in ($)</label>
              <input
                type="number"
                value={minBuyIn}
                onChange={e => setMinBuyIn(Number(e.target.value))}
                min={1}
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg px-3 py-2 text-[hsl(var(--foreground))] text-sm focus:border-[hsl(var(--ring))] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[hsl(var(--muted-foreground))] text-sm mb-1">Max Buy-in ($)</label>
              <input
                type="number"
                value={maxBuyIn}
                onChange={e => setMaxBuyIn(Number(e.target.value))}
                min={1}
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg px-3 py-2 text-[hsl(var(--foreground))] text-sm focus:border-[hsl(var(--ring))] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Max Players */}
          <div>
            <label className="block text-[hsl(var(--muted-foreground))] text-sm mb-1">Max Players</label>
            <select
              value={maxPlayers}
              onChange={e => setMaxPlayers(Number(e.target.value))}
              className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg px-3 py-2 text-[hsl(var(--foreground))] text-sm focus:border-[hsl(var(--ring))] focus:outline-none"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <option key={n} value={n}>{n} players{n === 2 ? ' (Heads-up)' : n === 6 ? ' (6-max)' : n === 9 ? ' (Full ring)' : ''}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-[hsl(var(--destructive))] text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] py-2.5 rounded-lg text-sm hover:opacity-80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[hsl(var(--accent))] hover:opacity-90 disabled:opacity-50 text-[hsl(var(--accent-foreground))] py-2.5 rounded-lg text-sm font-semibold transition-colors"
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

function JoinTableModal({ table, user, onClose, onJoined }: { table: TableView; user: UserInfo; onClose: () => void; onJoined: () => void }) {
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
        body: JSON.stringify({ playerId: user.id, displayName: user.displayName, buyIn }),
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
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[hsl(var(--card-foreground))] mb-1">Join {table.name}</h2>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mb-5">${table.smallBlind}/${table.bigBlind} · {table.playerCount}/{table.maxPlayers} players</p>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-[hsl(var(--muted-foreground))] text-sm mb-1">
              Buy-in (${table.minBuyIn} – ${table.maxBuyIn})
            </label>
            <input
              type="number"
              value={buyIn}
              onChange={e => setBuyIn(Number(e.target.value))}
              min={table.minBuyIn}
              max={table.maxBuyIn}
              step={table.bigBlind}
              className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg px-3 py-2 text-[hsl(var(--foreground))] text-sm focus:border-[hsl(var(--ring))] focus:outline-none"
            />
            <input
              type="range"
              value={buyIn}
              onChange={e => setBuyIn(Number(e.target.value))}
              min={table.minBuyIn}
              max={table.maxBuyIn}
              step={table.bigBlind}
              className="w-full mt-2 accent-[hsl(var(--accent))]"
            />
          </div>

          {error && <p className="text-[hsl(var(--destructive))] text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] py-2.5 rounded-lg text-sm hover:opacity-80 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 bg-[hsl(var(--accent))] hover:opacity-90 disabled:opacity-50 text-[hsl(var(--accent-foreground))] py-2.5 rounded-lg text-sm font-semibold transition-colors">
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
    // Fetch or create guest user session
    fetch('/api/v1/auth/session')
      .then(r => r.json())
      .then(d => { 
        if (d.user) {
          setUser(d.user);
        } else {
          // If no session, the backend will auto-create a guest user on first API call
          // We'll fetch the session again after a short delay
          setTimeout(() => {
            fetch('/api/v1/auth/session')
              .then(r => r.json())
              .then(d => { if (d.user) setUser(d.user); })
              .catch(() => {});
          }, 100);
        }
      })
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
    if (!user) return;
    await fetch(`/api/v1/tables/${tableId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: user.id }),
    });
    fetchTables();
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Nav */}
      <nav className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/lobby" className="text-[hsl(var(--foreground))] font-bold text-lg">♠ Poker</Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/lobby" className="text-[hsl(var(--accent))]">Lobby</Link>
              {(user?.role === 'superadmin' || user?.role === 'admin') && (
                <Link href="/admin" className="text-[hsl(var(--accent))] hover:opacity-80">⚙ Admin</Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-yellow-400 text-sm font-mono">${user.balance.toLocaleString()}</span>
                <span className="text-[hsl(var(--muted-foreground))] text-sm">{user.displayName}</span>
                <button
                  onClick={async () => {
                    await fetch('/api/v1/auth/logout', { method: 'POST' });
                    setUser(null);
                  }}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-[hsl(var(--accent))] hover:opacity-90 text-[hsl(var(--accent-foreground))] text-sm px-4 py-1.5 rounded-lg transition-colors">
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
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Cash Game Lobby</h1>
            <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
              {tables.length} table{tables.length !== 1 ? 's' : ''} · {totalPlayers} player{totalPlayers !== 1 ? 's' : ''} seated
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-[hsl(var(--accent))] hover:opacity-90 text-[hsl(var(--accent-foreground))] px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
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
                  ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:opacity-80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table Grid */}
        {loading ? (
          <div className="text-[hsl(var(--muted-foreground))] text-center py-20">Loading tables...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[hsl(var(--muted-foreground))] text-lg mb-2">No tables yet</p>
            <p className="text-[hsl(var(--muted-foreground))] opacity-70 text-sm mb-6">Create one to get started!</p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-[hsl(var(--accent))] hover:opacity-90 text-[hsl(var(--accent-foreground))] px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              + Create Table
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(table => {
              const isSeated = user ? table.players.some(p => p.id === user.id) : false;
              return (
                <div
                  key={table.id}
                  className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--accent))]/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[hsl(var(--card-foreground))] font-semibold group-hover:text-[hsl(var(--accent))] transition-colors">
                      {table.name}
                    </h3>
                    <StatusBadge status={table.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))] text-xs">Stakes</span>
                      <div className="text-[hsl(var(--card-foreground))] font-mono">${table.smallBlind}/${table.bigBlind}</div>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))] text-xs">Buy-in</span>
                      <div className="text-[hsl(var(--card-foreground))] font-mono text-xs mt-0.5">${table.minBuyIn}–${table.maxBuyIn}</div>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))] text-xs">Players</span>
                      <div className="text-[hsl(var(--card-foreground))]">
                        {table.playerCount}/{table.maxPlayers}
                        {table.status !== 'full' && table.playerCount > 0 && (
                          <span className="text-[hsl(var(--accent))] ml-1 text-xs">({table.maxPlayers - table.playerCount} open)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))] text-xs">Format</span>
                      <div className="text-[hsl(var(--card-foreground))] opacity-80 text-xs mt-0.5">
                        {table.maxPlayers === 2 ? 'Heads-up' : table.maxPlayers <= 6 ? `${table.maxPlayers}-max` : 'Full Ring'}
                      </div>
                    </div>
                  </div>

                  {/* Players list */}
                  {table.playerCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                      <div className="flex flex-wrap gap-1">
                        {table.players.map(p => (
                          <span key={p.id} className="text-xs bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] px-2 py-0.5 rounded">
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
                          className="flex-1 bg-[hsl(var(--accent))] hover:opacity-90 text-[hsl(var(--accent-foreground))] py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Go to Table
                        </button>
                        <button
                          onClick={() => handleLeave(table.id)}
                          className="bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--destructive))] text-[hsl(var(--secondary-foreground))] hover:text-[hsl(var(--destructive-foreground))] px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          Leave
                        </button>
                      </>
                    ) : table.status === 'full' ? (
                      <button
                        onClick={() => router.push(`/table/${table.id}`)}
                        className="flex-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:opacity-80 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Spectate
                      </button>
                    ) : (
                      <button
                        onClick={() => setJoinTarget(table)}
                        className="flex-1 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--secondary-foreground))] hover:text-[hsl(var(--accent-foreground))] py-2 rounded-lg text-sm font-medium transition-all"
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

      </div>

      {/* Modals */}
      {showCreate && <CreateTableModal onClose={() => setShowCreate(false)} onCreated={fetchTables} />}
      {joinTarget && user && <JoinTableModal table={joinTarget} user={user} onClose={() => setJoinTarget(null)} onJoined={fetchTables} />}
    </div>
  );
}
