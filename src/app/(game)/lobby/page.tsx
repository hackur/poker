'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TableInfo {
  id: string;
  name: string;
  blinds: string;
  players: number;
  maxPlayers: number;
  bots: number;
  avgPot: number;
  status: 'waiting' | 'active';
}

// Mock tables for prototype — will come from API in production
const MOCK_TABLES: TableInfo[] = [
  { id: 'demo', name: 'Beginner\'s Table', blinds: '$5/$10', players: 6, maxPlayers: 6, bots: 5, avgPot: 120, status: 'active' },
  { id: 'high-stakes', name: 'High Rollers', blinds: '$25/$50', players: 4, maxPlayers: 6, bots: 3, avgPot: 800, status: 'active' },
  { id: 'heads-up', name: 'Heads Up Arena', blinds: '$10/$20', players: 2, maxPlayers: 2, bots: 1, avgPot: 300, status: 'active' },
  { id: 'ai-battle', name: 'AI Battle Royale', blinds: '$5/$10', players: 6, maxPlayers: 6, bots: 6, avgPot: 200, status: 'active' },
  { id: 'practice', name: 'Practice Room', blinds: '$1/$2', players: 3, maxPlayers: 9, bots: 2, avgPot: 30, status: 'waiting' },
];

interface UserInfo {
  id: string;
  displayName: string;
  balance: number;
  role: string;
}

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tables] = useState<TableInfo[]>(MOCK_TABLES);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/v1/auth/session')
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const filtered = filter === 'all' ? tables
    : filter === 'open' ? tables.filter((t) => t.players < t.maxPlayers)
    : filter === 'bots' ? tables.filter((t) => t.bots > 0)
    : tables;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/lobby" className="text-white font-bold text-lg">♠ Poker</Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/lobby" className="text-emerald-400">Lobby</Link>
              <Link href="/table/demo" className="text-gray-400 hover:text-white">Quick Play</Link>
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
              <Link href="/login" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded-lg">
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
            <h1 className="text-2xl font-bold text-white">Table Lobby</h1>
            <p className="text-gray-500 text-sm mt-1">{tables.length} tables · {tables.reduce((s, t) => s + t.players, 0)} players online</p>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors">
            + Create Table
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'All Tables' },
            { key: 'open', label: 'Open Seats' },
            { key: 'bots', label: 'With AI Bots' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((table) => (
            <div
              key={table.id}
              className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors group cursor-pointer"
              onClick={() => router.push(`/table/${table.id}`)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold group-hover:text-emerald-400 transition-colors">
                  {table.name}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  table.status === 'active'
                    ? 'bg-green-900/50 text-green-400 border border-green-800'
                    : 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                }`}>
                  {table.status === 'active' ? 'In Progress' : 'Waiting'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 text-xs">Blinds</span>
                  <div className="text-white font-mono">{table.blinds}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-xs">Avg Pot</span>
                  <div className="text-yellow-400 font-mono">${table.avgPot}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-xs">Players</span>
                  <div className="text-white">
                    {table.players}/{table.maxPlayers}
                    {table.players < table.maxPlayers && (
                      <span className="text-emerald-400 ml-1 text-xs">({table.maxPlayers - table.players} open)</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 text-xs">AI Bots</span>
                  <div className="text-indigo-400">
                    {table.bots > 0 ? `${table.bots} 🤖` : 'None'}
                  </div>
                </div>
              </div>

              <button
                className="mt-4 w-full bg-gray-800 hover:bg-emerald-600 text-gray-400 hover:text-white py-2 rounded-lg text-sm font-medium transition-all"
              >
                {table.players < table.maxPlayers ? 'Join Table' : 'Spectate'}
              </button>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            title="Quick Play"
            description="Jump into the demo table with 5 AI opponents"
            href="/table/demo"
            icon="⚡"
          />
          <QuickAction
            title="Heads Up vs Nemotron"
            description="1v1 against Nemotron Nano — local AI on M3 Max"
            href="/table/heads-up-nemotron-local"
            icon="🧠"
          />
          <QuickAction
            title="AI Battle"
            description="Watch AI models play against each other"
            href="/table/ai-battle"
            icon="🤖"
          />
          <QuickAction
            title="Practice"
            description="Low-stakes table to learn the game"
            href="/table/practice"
            icon="📚"
          />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, description, href, icon }: { title: string; description: string; href: string; icon: string }) {
  return (
    <Link
      href={href}
      className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-emerald-800 hover:bg-gray-900 transition-colors group"
    >
      <span className="text-2xl">{icon}</span>
      <h3 className="text-white font-semibold mt-2 group-hover:text-emerald-400 transition-colors">{title}</h3>
      <p className="text-gray-500 text-sm mt-1">{description}</p>
    </Link>
  );
}
