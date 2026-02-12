'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ============================================================
// Types
// ============================================================

interface DashboardData {
  overview: {
    activeTables: number;
    activeGames: number;
    totalPlayers: number;
    registeredUsers: number;
    handsPlayed: number;
    totalPot: number;
    biggestPot: number;
  };
  tables: TableInfo[];
  activeGames: GameInfo[];
  recentHands: RecentHand[];
  playerStats: PlayerStat[];
  users: UserInfo[];
  system: {
    uptime: number;
    memoryUsage: { heapUsed: number; heapTotal: number; rss: number } | null;
    timestamp: number;
  };
}

interface TableInfo {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  playerCount: number;
  players: { id: string; displayName: string; seat: number }[];
  status: string;
  game?: GameInfo;
}

interface GameInfo {
  id: string;
  playerCount: number;
  handNumber: number;
  phase: string;
}

interface RecentHand {
  handNumber: number;
  gameId: string;
  pot: number;
  winners: { name: string; amount: number; handName?: string }[];
  playerCount: number;
  timestamp: number;
}

interface PlayerStat {
  playerId: string;
  playerName: string;
  handsPlayed: number;
  handsWon: number;
  biggestPot: number;
  netProfit: number;
  lastUpdated: number;
}

interface UserInfo {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  balance: number;
  createdAt: string;
  lastLoginAt?: string;
}

// ============================================================
// Admin Dashboard
// ============================================================

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'tables' | 'users' | 'stats' | 'system'>('overview');
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editBalance, setEditBalance] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, sessionRes] = await Promise.all([
        fetch('/api/v1/admin/dashboard'),
        fetch('/api/v1/auth/session'),
      ]);

      if (dashRes.status === 403) {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      const dashData = await dashRes.json();
      const sessionData = await sessionRes.json();

      setData(dashData);
      setCurrentUser(sessionData.user);
      setError(null);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Actions
  const kickPlayer = async (tableId: string, playerId: string) => {
    if (!confirm('Kick this player?')) return;
    await fetch(`/api/v1/admin/tables/${tableId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'kick', playerId }),
    });
    fetchData();
  };

  const deleteTableAction = async (tableId: string) => {
    if (!confirm('Delete this table? This cannot be undone.')) return;
    await fetch(`/api/v1/admin/tables/${tableId}`, { method: 'DELETE' });
    fetchData();
  };

  const updateUserAction = async (userId: string) => {
    const body: Record<string, unknown> = {};
    if (editRole) body.role = editRole;
    if (editBalance) body.balance = Number(editBalance);

    await fetch(`/api/v1/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setEditingUser(null);
    setEditRole('');
    setEditBalance('');
    fetchData();
  };

  // Access denied or loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-teal-400 animate-pulse text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400">⛔ {error || 'Access Denied'}</h1>
          <Link href="/lobby" className="text-teal-400 mt-4 inline-block hover:underline">← Back to Lobby</Link>
        </div>
      </div>
    );
  }

  const { overview, tables, recentHands, playerStats, users, system } = data;

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-[#111] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/lobby" className="text-white font-bold text-lg">♠ Poker</Link>
            <span className="text-teal-400 text-sm font-semibold tracking-wider uppercase">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">{currentUser?.displayName}</span>
            <Link href="/lobby" className="text-gray-400 hover:text-white text-sm">← Lobby</Link>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="border-b border-gray-800 bg-[#111]/50">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {(['overview', 'tables', 'users', 'stats', 'system'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-teal-400 border-b-2 border-teal-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Active Tables" value={overview.activeTables} icon="🎰" />
              <StatCard label="Players at Tables" value={overview.totalPlayers} icon="👥" />
              <StatCard label="Registered Users" value={overview.registeredUsers} icon="📋" />
              <StatCard label="Hands Played" value={overview.handsPlayed} icon="🃏" />
              <StatCard label="Active Games" value={overview.activeGames} icon="🎮" />
              <StatCard label="Total Pot Volume" value={`$${overview.totalPot.toLocaleString()}`} icon="💰" />
              <StatCard label="Biggest Pot" value={`$${overview.biggestPot.toLocaleString()}`} icon="🏆" />
              <StatCard label="Uptime" value={formatUptime(system.uptime)} icon="⏱" />
            </div>

            {/* Recent Hands */}
            <Section title="Recent Hands">
              {recentHands.length === 0 ? (
                <p className="text-gray-600 text-sm">No hands played yet</p>
              ) : (
                <div className="space-y-2">
                  {recentHands.slice(0, 10).map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#222] rounded-lg px-4 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 font-mono text-xs">#{h.handNumber}</span>
                        <span className="text-gray-400">{h.gameId}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500">{h.playerCount} players</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-teal-400 font-mono">${h.pot}</span>
                        <span className="text-gray-500 text-xs">
                          → {h.winners.map(w => w.name).join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Top Players */}
            <Section title="Top Players by Net Profit">
              {playerStats.length === 0 ? (
                <p className="text-gray-600 text-sm">No player stats yet</p>
              ) : (
                <div className="space-y-2">
                  {[...playerStats]
                    .sort((a, b) => b.netProfit - a.netProfit)
                    .slice(0, 10)
                    .map((p, i) => (
                      <div key={p.playerId} className="flex items-center justify-between bg-[#222] rounded-lg px-4 py-2 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600 font-mono w-6">#{i + 1}</span>
                          <span className="text-white">{p.playerName}</span>
                          <span className="text-gray-600 text-xs">{p.handsPlayed} hands</span>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-xs">
                          <span className="text-green-400">{p.handsWon}W</span>
                          <span className={p.netProfit >= 0 ? 'text-teal-400' : 'text-red-400'}>
                            {p.netProfit >= 0 ? '+' : ''}{p.netProfit}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* Tables Tab */}
        {tab === 'tables' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Tables ({tables.length})</h2>
            {tables.length === 0 ? (
              <p className="text-gray-600">No tables</p>
            ) : (
              tables.map(t => (
                <div key={t.id} className="bg-[#222] rounded-xl border border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-bold">{t.name}</h3>
                      <StatusBadge status={t.status} />
                      <span className="text-gray-500 text-xs font-mono">{t.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/table/${t.id}`}
                        className="px-3 py-1 bg-teal-600/20 text-teal-400 rounded text-xs hover:bg-teal-600/30"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => deleteTableAction(t.id)}
                        className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    {t.smallBlind}/{t.bigBlind} blinds • {t.playerCount}/{t.maxPlayers} players
                    {t.game && <> • Hand #{t.game.handNumber} • Phase: {t.game.phase}</>}
                  </div>

                  {t.players.length > 0 && (
                    <div className="space-y-1">
                      {t.players.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-[#1a1a1a] rounded px-3 py-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs">Seat {p.seat}</span>
                            <span className="text-white">{p.displayName}</span>
                          </div>
                          <button
                            onClick={() => kickPlayer(t.id, p.id)}
                            className="text-red-400/60 hover:text-red-400 text-xs"
                          >
                            Kick
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Users ({users.length})</h2>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="bg-[#222] rounded-xl border border-gray-800 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{u.displayName}</span>
                      <span className="text-gray-500 text-sm">@{u.username}</span>
                      <span className="text-gray-600 text-xs">{u.email}</span>
                      <RoleBadge role={u.role} />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-yellow-400 font-mono text-sm">${u.balance.toLocaleString()}</span>
                      {editingUser === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={e => setEditRole(e.target.value)}
                            className="bg-[#1a1a1a] border border-gray-700 text-white text-xs rounded px-2 py-1"
                          >
                            <option value="">Role...</option>
                            <option value="player">player</option>
                            <option value="admin">admin</option>
                            <option value="superadmin">superadmin</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Balance"
                            value={editBalance}
                            onChange={e => setEditBalance(e.target.value)}
                            className="bg-[#1a1a1a] border border-gray-700 text-white text-xs rounded px-2 py-1 w-24"
                          />
                          <button
                            onClick={() => updateUserAction(u.id)}
                            className="px-2 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingUser(null); setEditRole(''); setEditBalance(''); }}
                            className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingUser(u.id); setEditRole(''); setEditBalance(String(u.balance)); }}
                          className="px-2 py-1 bg-gray-700/50 text-gray-400 rounded text-xs hover:bg-gray-700"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                    {u.lastLoginAt && <> • Last login {new Date(u.lastLoginAt).toLocaleDateString()}</>}
                    <span className="ml-2 text-gray-700">{u.id.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {tab === 'stats' && (
          <div className="space-y-6">
            <Section title="Game Statistics">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MiniStat label="Total Hands" value={overview.handsPlayed} />
                <MiniStat label="Biggest Pot" value={`$${overview.biggestPot}`} />
                <MiniStat label="Total Pot Volume" value={`$${overview.totalPot.toLocaleString()}`} />
                <MiniStat label="Avg Pot" value={overview.handsPlayed ? `$${Math.round(overview.totalPot / overview.handsPlayed)}` : '$0'} />
                <MiniStat label="Active Games" value={overview.activeGames} />
                <MiniStat label="Players Tracked" value={playerStats.length} />
              </div>
            </Section>

            <Section title="All Players">
              {playerStats.length === 0 ? (
                <p className="text-gray-600 text-sm">No stats yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-left text-xs uppercase">
                        <th className="pb-2 pr-4">Player</th>
                        <th className="pb-2 pr-4">Hands</th>
                        <th className="pb-2 pr-4">Wins</th>
                        <th className="pb-2 pr-4">Win %</th>
                        <th className="pb-2 pr-4">Biggest Pot</th>
                        <th className="pb-2 pr-4">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...playerStats].sort((a, b) => b.netProfit - a.netProfit).map(p => (
                        <tr key={p.playerId} className="border-t border-gray-800">
                          <td className="py-2 pr-4 text-white">{p.playerName}</td>
                          <td className="py-2 pr-4 text-gray-400 font-mono">{p.handsPlayed}</td>
                          <td className="py-2 pr-4 text-green-400 font-mono">{p.handsWon}</td>
                          <td className="py-2 pr-4 text-gray-400 font-mono">
                            {p.handsPlayed ? Math.round((p.handsWon / p.handsPlayed) * 100) : 0}%
                          </td>
                          <td className="py-2 pr-4 text-yellow-400 font-mono">${p.biggestPot}</td>
                          <td className={`py-2 pr-4 font-mono ${p.netProfit >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                            {p.netProfit >= 0 ? '+' : ''}{p.netProfit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* System Tab */}
        {tab === 'system' && (
          <div className="space-y-6">
            <Section title="System Health">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MiniStat label="Uptime" value={formatUptime(system.uptime)} />
                {system.memoryUsage && (
                  <>
                    <MiniStat label="Heap Used" value={formatBytes(system.memoryUsage.heapUsed)} />
                    <MiniStat label="Heap Total" value={formatBytes(system.memoryUsage.heapTotal)} />
                    <MiniStat label="RSS" value={formatBytes(system.memoryUsage.rss)} />
                    <MiniStat
                      label="Heap Usage"
                      value={`${Math.round((system.memoryUsage.heapUsed / system.memoryUsage.heapTotal) * 100)}%`}
                    />
                  </>
                )}
                <MiniStat label="Server Time" value={new Date(system.timestamp).toLocaleTimeString()} />
              </div>
            </Section>

            <Section title="Store Sizes">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStat label="Users" value={users.length} />
                <MiniStat label="Tables" value={tables.length} />
                <MiniStat label="Hand Records" value={overview.handsPlayed} />
                <MiniStat label="Player Stats" value={playerStats.length} />
              </div>
            </Section>

            <Section title="Analytics Config">
              <Link
                href="/admin/analytics"
                className="inline-block px-4 py-2 bg-teal-600/20 text-teal-400 rounded-lg text-sm hover:bg-teal-600/30"
              >
                Manage Analytics Settings →
              </Link>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-[#222] rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold font-mono text-teal-400">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#222] rounded-xl border border-gray-800 p-6">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    waiting: 'bg-yellow-900/50 text-yellow-400',
    playing: 'bg-green-900/50 text-green-400',
    full: 'bg-red-900/50 text-red-400',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[status] || 'bg-gray-700 text-gray-400'}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    superadmin: 'bg-red-900/50 text-red-400',
    admin: 'bg-teal-900/50 text-teal-400',
    player: 'bg-gray-700 text-gray-400',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[role] || 'bg-gray-700 text-gray-400'}`}>
      {role}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-mono text-white mt-0.5">{value}</div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
