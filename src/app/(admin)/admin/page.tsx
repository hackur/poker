'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function AdminPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [stats] = useState({ tables: 5, players: 21, handsToday: 142, rake: 680 });

  useEffect(() => {
    fetch('/api/v1/auth/session').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
    fetch('/api/v1/admin/users').then((r) => r.json()).then((d) => setUsers(d.users ?? [])).catch(() => {});
  }, []);

  if (user && user.role !== 'superadmin' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
          <p className="text-gray-500 mt-2">Admin privileges required.</p>
          <Link href="/lobby" className="text-emerald-400 mt-4 inline-block hover:underline">← Back to Lobby</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/lobby" className="text-white font-bold text-lg">♠ Poker</Link>
            <span className="text-orange-400 text-sm font-semibold">Admin</span>
          </div>
          <Link href="/lobby" className="text-gray-400 hover:text-white text-sm">← Lobby</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Tables" value={String(stats.tables)} color="emerald" />
          <StatCard label="Players Online" value={String(stats.players)} color="blue" />
          <StatCard label="Hands Today" value={String(stats.handsToday)} color="yellow" />
          <StatCard label="Rake Collected" value={`$${stats.rake}`} color="purple" />
        </div>

        {/* Sections */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Users */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Users ({users.length})</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 text-sm">
                  <div>
                    <span className="text-white font-medium">{u.displayName}</span>
                    <span className="text-gray-500 ml-2">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 font-mono">${u.balance}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      u.role === 'superadmin' ? 'bg-red-900/50 text-red-400' :
                      u.role === 'admin' ? 'bg-orange-900/50 text-orange-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-gray-600 text-sm">No users yet</p>}
            </div>
          </div>

          {/* Bot Performance */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Bot Drivers</h2>
            <div className="space-y-2">
              {[
                { name: 'Nemotron Nano', wins: 23, losses: 17, profit: 340 },
                { name: 'Nemotron Deep', wins: 18, losses: 12, profit: 520 },
                { name: 'GPT-4o', wins: 31, losses: 25, profit: -180 },
                { name: 'Gemini Flash', wins: 14, losses: 8, profit: 290 },
                { name: 'Claude Sonnet', wins: 20, losses: 15, profit: 410 },
              ].map((bot) => (
                <div key={bot.name} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-white">{bot.name} <span className="text-indigo-400 text-xs">🤖</span></span>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-green-400">{bot.wins}W</span>
                    <span className="text-red-400">{bot.losses}L</span>
                    <span className={bot.profit >= 0 ? 'text-yellow-400' : 'text-red-400'}>
                      {bot.profit >= 0 ? '+' : ''}{bot.profit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Manage Bot Drivers', desc: 'Configure AI models and play styles', href: '/table/demo' },
                { label: 'View Audit Log', desc: 'All admin actions and game events', href: '#' },
                { label: 'Economy Overview', desc: 'Balance distribution and rake stats', href: '#' },
              ].map((action) => (
                <Link key={action.label} href={action.href}
                  className="block bg-gray-800/50 hover:bg-gray-800 rounded-lg px-4 py-3 transition-colors">
                  <div className="text-white text-sm font-medium">{action.label}</div>
                  <div className="text-gray-500 text-xs">{action.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
            <div className="space-y-2 text-sm">
              {[
                { time: '2 min ago', event: 'Nemotron Nano won $340 pot', type: 'bot' },
                { time: '5 min ago', event: 'New user registered: pokerpro99', type: 'user' },
                { time: '12 min ago', event: 'Table "High Rollers" created', type: 'table' },
                { time: '1 hour ago', event: 'GPT-4o bluffed with 7-high', type: 'bot' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-gray-400">
                  <span className="text-gray-600 text-xs w-16 shrink-0 pt-0.5">{a.time}</span>
                  <span>{a.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const c: Record<string, string> = {
    emerald: 'bg-emerald-900/30 border-emerald-800 text-emerald-400',
    blue: 'bg-blue-900/30 border-blue-800 text-blue-400',
    yellow: 'bg-yellow-900/30 border-yellow-800 text-yellow-400',
    purple: 'bg-purple-900/30 border-purple-800 text-purple-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${c[color]}`}>
      <div className="text-xs uppercase tracking-wider opacity-60">{label}</div>
      <div className="text-2xl font-bold font-mono mt-1">{value}</div>
    </div>
  );
}
