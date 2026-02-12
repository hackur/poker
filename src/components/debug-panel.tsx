'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlayerGameView } from '@/lib/poker/types';

interface BotDecision {
  botId: string;
  botName: string;
  modelId: string;
  provider: string;
  prompt: string;
  rawResponse: string;
  action: { type: string; amount?: number };
  reasoning: string;
  handAssessment: string;
  inferenceTimeMs: number;
  tokens?: { prompt: number; completion: number };
  isFallback: boolean;
  timestamp: number;
}

interface Driver {
  id: string;
  displayName: string;
  provider: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  status: string;
  transparency: string;
  personality: {
    description: string;
    style: string;
    systemPrompt: string;
    aggression: number;
    tightness: number;
    bluffFreq: number;
    riskTolerance: number;
    thinkTimeMs: [number, number];
  };
}

interface DebugPanelProps {
  gameState: PlayerGameView | null;
  onUpdateBot?: (botId: string, field: string, value: string | number) => void;
  onResetGame?: () => void;
}

export function DebugPanel({ gameState, onUpdateBot, onResetGame }: DebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'drivers' | 'decisions' | 'state' | 'controls'>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [decisions, setDecisions] = useState<BotDecision[]>([]);

  // Fetch drivers
  useEffect(() => {
    if (!open) return;
    fetch('/api/v1/drivers').then((r) => r.json()).then((d) => setDrivers(d.drivers ?? [])).catch(() => {});
  }, [open, tab]);

  // Fetch decisions
  useEffect(() => {
    if (!open || tab !== 'decisions') return;
    const poll = () => fetch('/api/v1/decisions').then((r) => r.json()).then((d) => setDecisions(d.decisions ?? [])).catch(() => {});
    poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [open, tab]);

  // Keyboard: D toggles panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'd') setOpen((v) => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 px-1.5 py-6 rounded-l-lg text-xs font-mono tracking-widest transition-all
          ${open ? 'right-[420px]' : 'right-0'} bg-orange-600 hover:bg-orange-500 text-white`}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        DEBUG
      </button>

      <div className={`fixed top-0 right-0 h-full w-[420px] z-40 bg-gray-950 border-l border-gray-800 shadow-2xl
        transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-orange-500 text-lg">🔧</span>
            <span className="text-white font-bold text-sm">Debug Panel</span>
          </div>
          <div className="flex gap-1">
            {(['drivers', 'decisions', 'state', 'controls'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-2 py-1 text-[10px] rounded-md capitalize ${
                  tab === t ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'drivers' && <DriversTab drivers={drivers} setDrivers={setDrivers} onUpdateBot={onUpdateBot} />}
          {tab === 'decisions' && <DecisionsTab decisions={decisions} />}
          {tab === 'state' && <StateTab gameState={gameState} />}
          {tab === 'controls' && <ControlsTab gameState={gameState} onResetGame={onResetGame} />}
        </div>
      </div>
    </>
  );
}

// ============================================================
// Drivers Tab
// ============================================================

function DriversTab({ drivers, setDrivers, onUpdateBot }: {
  drivers: Driver[];
  setDrivers: (d: Driver[]) => void;
  onUpdateBot?: (botId: string, field: string, value: string | number) => void;
}) {
  const checkHealth = useCallback(async (driverId: string) => {
    const res = await fetch('/api/v1/drivers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_health', driverId }),
    });
    const data = await res.json();
    setDrivers(drivers.map((d) => d.id === driverId ? { ...d, status: data.status } : d));
  }, [drivers, setDrivers]);

  const toggleEnabled = useCallback(async (driverId: string, enabled: boolean) => {
    await fetch('/api/v1/drivers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', driverId, updates: { enabled } }),
    });
    setDrivers(drivers.map((d) => d.id === driverId ? { ...d, enabled } : d));
  }, [setDrivers]);

  const localDrivers = drivers.filter((d) => ['lmstudio', 'ollama', 'custom'].includes(d.provider));
  const cloudDrivers = drivers.filter((d) => !['lmstudio', 'ollama', 'custom'].includes(d.provider));

  return (
    <div className="space-y-4">
      <SectionHeader title="Local Models (LM Studio / Ollama)" />
      <p className="text-gray-500 text-[10px]">
        Connect to local models via OpenAI-compatible API. Start LM Studio or Ollama, load a model, then check health.
      </p>
      {localDrivers.map((d) => (
        <DriverCard key={d.id} driver={d} onCheckHealth={checkHealth} onToggle={toggleEnabled} />
      ))}

      <SectionHeader title="Cloud Models (API Key Required)" />
      {cloudDrivers.map((d) => (
        <DriverCard key={d.id} driver={d} onCheckHealth={checkHealth} onToggle={toggleEnabled} />
      ))}

      <div className="mt-2 p-3 bg-gray-900 rounded-lg border border-gray-800 text-[10px] text-gray-500 space-y-1">
        <p><strong>🏠 LM Studio:</strong> Start server → load <code>nemotron-3-nano</code> → endpoint: <code>http://localhost:1234/v1</code></p>
        <p><strong>🦙 Ollama:</strong> <code>ollama serve</code> → <code>ollama run llama3.3:70b</code> → endpoint: <code>http://localhost:11434/v1</code></p>
        <p><strong>☁️ Cloud:</strong> Set API key in driver config or use OpenRouter for multi-model access</p>
      </div>
    </div>
  );
}

function DriverCard({ driver, onCheckHealth, onToggle }: {
  driver: Driver;
  onCheckHealth: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColors: Record<string, string> = {
    connected: 'bg-green-500', disconnected: 'bg-red-500', error: 'bg-orange-500', unchecked: 'bg-gray-500',
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${driver.enabled ? 'bg-gray-900 border-gray-700' : 'bg-gray-900/50 border-gray-800 opacity-60'}`}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[driver.status] ?? 'bg-gray-500'}`} />
          <span className="text-white text-sm font-medium">{driver.displayName}</span>
          <span className="text-gray-500 text-[10px]">{driver.provider}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px] font-mono">{driver.modelId}</span>
          <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-800 pt-2">
          {/* Personality description */}
          <p className="text-gray-400 text-[10px] leading-relaxed">{driver.personality.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-1 text-[9px]">
            <MiniStat label="AGG" value={driver.personality.aggression} />
            <MiniStat label="TIGHT" value={driver.personality.tightness} />
            <MiniStat label="BLUFF" value={driver.personality.bluffFreq} />
            <MiniStat label="RISK" value={driver.personality.riskTolerance} />
          </div>

          {/* Style badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Style:</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-800">
              {driver.personality.style}
            </span>
          </div>

          {/* Endpoint */}
          <div>
            <span className="text-[10px] text-gray-500">Endpoint:</span>
            <code className="block text-[10px] text-gray-300 mt-0.5 bg-gray-800 px-2 py-1 rounded">{driver.baseUrl}</code>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onCheckHealth(driver.id)}
              className="px-3 py-1 text-[10px] bg-blue-900/50 text-blue-300 border border-blue-800 rounded hover:bg-blue-900">
              Check Health
            </button>
            <button onClick={() => onToggle(driver.id, !driver.enabled)}
              className={`px-3 py-1 text-[10px] rounded border ${
                driver.enabled
                  ? 'bg-red-900/30 text-red-300 border-red-800 hover:bg-red-900'
                  : 'bg-green-900/30 text-green-300 border-green-800 hover:bg-green-900'
              }`}>
              {driver.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          {/* Status message */}
          <div className={`text-[10px] ${
            driver.status === 'connected' ? 'text-green-400' :
            driver.status === 'disconnected' ? 'text-red-400' :
            driver.status === 'error' ? 'text-orange-400' : 'text-gray-500'
          }`}>
            Status: {driver.status}
            {driver.status === 'connected' && ' ✓ Model will make AI-driven decisions'}
            {driver.status === 'disconnected' && ' — Using rule-based fallback'}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct > 70 ? 'text-red-400' : pct > 40 ? 'text-yellow-400' : 'text-blue-400';
  return (
    <div className="text-center">
      <div className={`font-mono font-bold ${color}`}>{pct}%</div>
      <div className="text-gray-600 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ============================================================
// Decisions Tab
// ============================================================

function DecisionsTab({ decisions }: { decisions: BotDecision[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (decisions.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No decisions yet. Waiting for bots to act...
      </div>
    );
  }

  const selected = selectedIdx !== null ? decisions[selectedIdx] : null;

  return (
    <div className="space-y-3">
      <SectionHeader title={`Decision Log (${decisions.length})`} />

      {/* Decision list */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {decisions.map((d, i) => (
          <button key={i} onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
            className={`w-full text-left px-2 py-1.5 rounded text-[10px] flex items-center gap-2 transition-colors
              ${selectedIdx === i ? 'bg-orange-900/30 border border-orange-800' : 'bg-gray-900 hover:bg-gray-800'}`}>
            <span className={`font-bold w-14 ${d.isFallback ? 'text-gray-500' : 'text-indigo-400'}`}>
              {d.botName}
            </span>
            <span className={`w-12 font-mono ${
              d.action.type === 'fold' ? 'text-red-400' :
              d.action.type === 'raise' || d.action.type === 'bet' ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {d.action.type}{d.action.amount ? ` $${d.action.amount}` : ''}
            </span>
            <span className="text-gray-600 flex-1 truncate">{d.handAssessment}</span>
            <span className="text-gray-600 font-mono">
              {d.isFallback ? 'rule' : `${d.inferenceTimeMs}ms`}
            </span>
          </button>
        ))}
      </div>

      {/* Selected decision detail */}
      {selected && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-sm">{selected.botName}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              selected.isFallback ? 'bg-gray-800 text-gray-400' : 'bg-indigo-900/50 text-indigo-300'
            }`}>
              {selected.isFallback ? 'Rule-based' : selected.modelId}
            </span>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Action</label>
            <div className="text-white text-sm font-mono">
              {selected.action.type}{selected.action.amount ? ` $${selected.action.amount}` : ''}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Hand Assessment</label>
            <div className="text-gray-300 text-xs">{selected.handAssessment}</div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Reasoning</label>
            <pre className="text-gray-300 text-[10px] whitespace-pre-wrap mt-0.5 bg-gray-800 rounded p-2 max-h-40 overflow-y-auto">
              {selected.reasoning}
            </pre>
          </div>

          {selected.tokens && (
            <div className="text-[10px] text-gray-500">
              Tokens: {selected.tokens.prompt} prompt + {selected.tokens.completion} completion | {selected.inferenceTimeMs}ms
            </div>
          )}

          {selected.rawResponse && !selected.isFallback && (
            <details className="text-[10px]">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-300">Raw model response</summary>
              <pre className="mt-1 text-gray-500 bg-gray-800 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                {selected.rawResponse}
              </pre>
            </details>
          )}

          {!selected.isFallback && (
            <details className="text-[10px]">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-300">Prompt sent to model</summary>
              <pre className="mt-1 text-gray-500 bg-gray-800 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                {selected.prompt}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// State Tab
// ============================================================

function StateTab({ gameState }: { gameState: PlayerGameView | null }) {
  if (!gameState) return <p className="text-gray-500 text-sm">No game state</p>;

  return (
    <div className="space-y-3">
      <SectionHeader title="Game State" />
      <div className="grid grid-cols-2 gap-2">
        <StatBadge label="Phase" value={gameState.phase} color="emerald" />
        <StatBadge label="Hand #" value={String(gameState.handNumber)} color="blue" />
        <StatBadge label="Pot" value={`$${gameState.pots.reduce((s, p) => s + p.amount, 0)}`} color="yellow" />
        <StatBadge label="Current Bet" value={`$${gameState.currentBet}`} color="orange" />
        <StatBadge label="Dealer" value={`Seat ${gameState.dealerSeat}`} color="purple" />
        <StatBadge label="Active" value={gameState.activePlayerSeat !== null ? `Seat ${gameState.activePlayerSeat}` : '—'} color="pink" />
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase">Your Cards</label>
        <div className="text-white text-sm font-mono mt-0.5">
          {gameState.myCards.length > 0
            ? gameState.myCards.map((c) => `${rk(c.rank)}${st(c.suit)}`).join(' ')
            : '—'}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase">Community</label>
        <div className="text-white text-sm font-mono mt-0.5">
          {gameState.communityCards.length > 0
            ? gameState.communityCards.map((c) => `${rk(c.rank)}${st(c.suit)}`).join(' ')
            : '—'}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase">Players</label>
        <div className="mt-1 text-[10px] font-mono space-y-0.5">
          {gameState.players.map((p) => (
            <div key={p.seat} className={`flex gap-1 ${p.folded ? 'text-gray-600' : 'text-gray-300'}`}>
              <span className="w-3">{p.isActive ? '→' : ' '}</span>
              <span className="w-4">{p.seat}</span>
              <span className="w-16 truncate">{p.name}</span>
              <span className="w-12 text-right">${p.stack}</span>
              <span className="w-10 text-right text-orange-400">{p.currentBet ? `$${p.currentBet}` : ''}</span>
              <span className="w-6">{p.folded ? 'F' : p.allIn ? 'A' : ''}</span>
              {p.isBot && <span className="text-indigo-500">🤖</span>}
            </div>
          ))}
        </div>
      </div>

      <details>
        <summary className="text-[10px] text-gray-500 uppercase cursor-pointer hover:text-gray-300">Raw JSON</summary>
        <pre className="mt-1 text-[9px] text-gray-500 bg-gray-900 rounded p-2 overflow-auto max-h-60 whitespace-pre-wrap break-all">
          {JSON.stringify(gameState, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ============================================================
// Controls Tab
// ============================================================

function ControlsTab({ gameState, onResetGame }: { gameState: PlayerGameView | null; onResetGame?: () => void }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Game Controls" />
      <button onClick={onResetGame}
        className="w-full text-left p-3 rounded-lg border bg-red-900/30 border-red-800 hover:bg-red-900/60 text-red-400">
        <div className="font-semibold text-sm">Reset Game</div>
        <div className="text-[10px] opacity-60 mt-0.5">Reset all stacks to 1000, restart from hand 1</div>
      </button>

      <SectionHeader title="Environment" />
      <div className="space-y-1 text-xs">
        {[
          ['Runtime', 'Next.js 15'],
          ['API', '/api/v1'],
          ['Polling', '1000ms'],
          ['Bot Engine', 'Rule-based + AI drivers'],
          ['Local Models', 'LM Studio / Ollama (OpenAI-compat)'],
          ['Hand #', String(gameState?.handNumber ?? 0)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-gray-400">
            <span className="text-gray-600">{k}</span>
            <span className="font-mono">{v}</span>
          </div>
        ))}
      </div>

      <SectionHeader title="Keyboard Shortcuts" />
      <div className="space-y-1 text-xs text-gray-400">
        <div><kbd className="text-orange-400 font-mono">D</kbd> Toggle debug panel</div>
        <div><kbd className="text-orange-400 font-mono">F</kbd> Fold</div>
        <div><kbd className="text-orange-400 font-mono">C</kbd> Check / Call</div>
        <div><kbd className="text-orange-400 font-mono">R</kbd> Raise (min)</div>
      </div>
    </div>
  );
}

// ============================================================
// Shared
// ============================================================

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-gray-400 text-[10px] uppercase tracking-widest font-semibold border-b border-gray-800 pb-1">{title}</h3>;
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const c: Record<string, string> = {
    emerald: 'bg-emerald-900/50 text-emerald-400 border-emerald-800',
    blue: 'bg-blue-900/50 text-blue-400 border-blue-800',
    yellow: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
    orange: 'bg-orange-900/50 text-orange-400 border-orange-800',
    purple: 'bg-purple-900/50 text-purple-400 border-purple-800',
    pink: 'bg-pink-900/50 text-pink-400 border-pink-800',
  };
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${c[color] ?? c.blue}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-sm font-mono font-bold">{value}</div>
    </div>
  );
}

function rk(rank: number): string { return { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[rank] ?? String(rank); }
function st(suit: string): string { return { h: '♥', d: '♦', c: '♣', s: '♠' }[suit] ?? suit; }
