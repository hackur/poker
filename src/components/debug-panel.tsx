'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  handNumber?: number;
  gameId?: string;
  street?: string;
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

interface HandRecord {
  gameId: string;
  handNumber: number;
  timestamp: number;
  blinds: { small: number; big: number };
  players: {
    seat: number; name: string; isBot: boolean; botModel?: string;
    startStack: number; endStack: number;
    holeCards?: { rank: number; suit: string }[];
    isDealer: boolean;
  }[];
  actions: { seat: number; name: string; street: string; action: string; amount?: number; timestamp: number }[];
  communityCards: { rank: number; suit: string }[];
  winners: { seat: number; name: string; amount: number; handName?: string }[];
  pot: number;
  decisions: BotDecision[];
}

interface DebugPanelProps {
  gameState: PlayerGameView | null;
  onUpdateBot?: (botId: string, field: string, value: string | number) => void;
  onResetGame?: () => void;
}

export function DebugPanel({ gameState, onUpdateBot, onResetGame }: DebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'history' | 'drivers' | 'decisions' | 'state' | 'controls'>('history');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [decisions, setDecisions] = useState<BotDecision[]>([]);
  const [hands, setHands] = useState<HandRecord[]>([]);

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

  // Fetch hand history
  useEffect(() => {
    if (!open || tab !== 'history') return;
    const gameId = gameState?.id;
    const poll = () => {
      const url = gameId ? `/api/v1/history?gameId=${gameId}` : '/api/v1/history';
      fetch(url).then((r) => r.json()).then((d) => setHands(d.hands ?? [])).catch(() => {});
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [open, tab, gameState?.id]);

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
            {(['history', 'drivers', 'decisions', 'state', 'controls'] as const).map((t) => (
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
          {tab === 'history' && <HandHistoryTab hands={hands} />}
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
// Hand History Tab
// ============================================================

function HandHistoryTab({ hands }: { hands: HandRecord[] }) {
  const [expandedHand, setExpandedHand] = useState<number | null>(null);
  const [expandedDecision, setExpandedDecision] = useState<number | null>(null);

  if (hands.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No completed hands yet. Play a hand to see history here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader title={`Hand History (${hands.length})`} />

      <div className="space-y-2">
        {hands.map((hand) => {
          const isExpanded = expandedHand === hand.handNumber;
          const winnerNames = hand.winners.map((w) => w.name).join(', ');
          const winAmount = hand.winners.reduce((s, w) => s + w.amount, 0);

          return (
            <div key={hand.handNumber} className="rounded-lg border border-gray-800 overflow-hidden bg-gray-900">
              {/* Hand summary row */}
              <button
                onClick={() => { setExpandedHand(isExpanded ? null : hand.handNumber); setExpandedDecision(null); }}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-800/50 flex items-center gap-2"
              >
                <span className="text-orange-400 font-mono font-bold text-sm w-8">#{hand.handNumber}</span>
                <span className="text-yellow-400 font-mono text-xs w-12">${winAmount}</span>
                <span className="text-gray-300 text-xs flex-1 truncate">
                  {winnerNames} wins
                  {hand.winners[0]?.handName && <span className="text-emerald-400 ml-1">({hand.winners[0].handName})</span>}
                </span>
                <span className="text-gray-600 text-[10px]">
                  {hand.communityCards.length > 0
                    ? hand.communityCards.map((c) => `${rk(c.rank)}${st(c.suit)}`).join(' ')
                    : 'no board'}
                </span>
                <span className="text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {/* Expanded hand details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-2">
                  {/* Players */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Players</label>
                    <div className="mt-1 space-y-0.5 text-[10px] font-mono">
                      {hand.players.map((p) => {
                        const delta = p.endStack - p.startStack;
                        const isWinner = hand.winners.some((w) => w.seat === p.seat);
                        return (
                          <div key={p.seat} className="flex items-center gap-1.5">
                            {p.isDealer && <span className="text-yellow-500 w-3">D</span>}
                            {!p.isDealer && <span className="w-3" />}
                            <span className={`w-20 truncate ${isWinner ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
                              {p.name}
                            </span>
                            {p.isBot && <span className="text-indigo-500 text-[9px]">🤖</span>}
                            <span className="text-gray-500 w-14 text-right">${p.startStack}</span>
                            <span className="text-gray-600 w-3 text-center">→</span>
                            <span className="text-gray-300 w-14 text-right">${p.endStack}</span>
                            <span className={`w-14 text-right font-bold ${
                              delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-600'
                            }`}>
                              {delta > 0 ? '+' : ''}{delta !== 0 ? `$${delta}` : '—'}
                            </span>
                            {p.holeCards && p.holeCards.length > 0 && (
                              <span className="text-gray-400 ml-1">
                                [{p.holeCards.map((c) => `${rk(c.rank)}${st(c.suit)}`).join(' ')}]
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Board */}
                  {hand.communityCards.length > 0 && (
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">Board</label>
                      <div className="text-sm font-mono text-white mt-0.5">
                        {hand.communityCards.map((c) => `${rk(c.rank)}${st(c.suit)}`).join(' ')}
                      </div>
                    </div>
                  )}

                  {/* Action timeline */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Actions</label>
                    <div className="mt-1 space-y-0.5">
                      {groupActionsByStreet(hand.actions).map(({ street, actions: streetActions }) => (
                        <div key={street}>
                          <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-1 mb-0.5">{street}</div>
                          {streetActions.map((a, i) => (
                            <div key={i} className="text-[10px] font-mono flex gap-1.5 pl-2">
                              <span className="text-gray-400 w-20 truncate">{a.name}</span>
                              <span className={`font-bold ${
                                a.action === 'fold' ? 'text-red-400' :
                                a.action === 'raise' || a.action === 'bet' ? 'text-yellow-400' :
                                a.action === 'all_in' ? 'text-orange-400' :
                                'text-green-400'
                              }`}>
                                {a.action}{a.amount ? ` $${a.amount}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Decisions / Reasoning */}
                  {hand.decisions.length > 0 && (
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">
                        AI Reasoning ({hand.decisions.length} decision{hand.decisions.length > 1 ? 's' : ''})
                      </label>
                      <div className="mt-1 space-y-1">
                        {hand.decisions.map((dec, i) => {
                          const isDecExpanded = expandedDecision === i;
                          return (
                            <div key={i} className="rounded border border-gray-800 overflow-hidden">
                              <button
                                onClick={() => setExpandedDecision(isDecExpanded ? null : i)}
                                className="w-full text-left px-2 py-1.5 hover:bg-gray-800/50 flex items-center gap-1.5 text-[10px]"
                              >
                                <span className={`font-bold w-20 truncate ${dec.isFallback ? 'text-gray-500' : 'text-indigo-400'}`}>
                                  {dec.botName}
                                </span>
                                <span className="text-gray-500 w-12">{dec.street ?? ''}</span>
                                <span className={`font-mono ${
                                  dec.action.type === 'fold' ? 'text-red-400' :
                                  dec.action.type === 'raise' || dec.action.type === 'bet' ? 'text-yellow-400' :
                                  'text-green-400'
                                }`}>
                                  {dec.action.type}{dec.action.amount ? ` $${dec.action.amount}` : ''}
                                </span>
                                <span className="text-gray-600 ml-auto font-mono">
                                  {dec.isFallback ? 'rule' : `${dec.inferenceTimeMs}ms`}
                                </span>
                                <span className="text-gray-600">{isDecExpanded ? '▲' : '▼'}</span>
                              </button>

                              {isDecExpanded && (
                                <div className="px-2 pb-2 space-y-1.5 border-t border-gray-800 pt-1.5">
                                  <div>
                                    <label className="text-[9px] text-gray-600 uppercase">Hand Assessment</label>
                                    <div className="text-[10px] text-gray-300">{dec.handAssessment}</div>
                                  </div>

                                  <div>
                                    <label className="text-[9px] text-gray-600 uppercase">Reasoning</label>
                                    <pre className="text-[10px] text-gray-300 whitespace-pre-wrap bg-gray-800 rounded p-2 max-h-48 overflow-y-auto mt-0.5">
                                      {dec.reasoning}
                                    </pre>
                                  </div>

                                  {dec.tokens && (
                                    <div className="text-[9px] text-gray-600">
                                      Tokens: {dec.tokens.prompt} prompt + {dec.tokens.completion} completion
                                    </div>
                                  )}

                                  {dec.rawResponse && !dec.isFallback && (
                                    <details className="text-[10px]">
                                      <summary className="text-gray-600 cursor-pointer hover:text-gray-400">Raw response</summary>
                                      <pre className="mt-1 text-gray-500 bg-gray-800 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                                        {dec.rawResponse}
                                      </pre>
                                    </details>
                                  )}

                                  {!dec.isFallback && (
                                    <details className="text-[10px]">
                                      <summary className="text-gray-600 cursor-pointer hover:text-gray-400">Prompt</summary>
                                      <pre className="mt-1 text-gray-500 bg-gray-800 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                                        {dec.prompt}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Group actions by street for display */
function groupActionsByStreet(actions: HandRecord['actions']): { street: string; actions: HandRecord['actions'] }[] {
  const groups: { street: string; actions: HandRecord['actions'] }[] = [];
  let currentStreet = '';
  for (const a of actions) {
    if (a.street !== currentStreet) {
      currentStreet = a.street;
      groups.push({ street: currentStreet, actions: [] });
    }
    groups[groups.length - 1].actions.push(a);
  }
  return groups;
}

// ============================================================
// Drivers Tab
// ============================================================

function DriversTab({ drivers, setDrivers, onUpdateBot }: {
  drivers: Driver[];
  setDrivers: (d: Driver[]) => void;
  onUpdateBot?: (botId: string, field: string, value: string | number) => void;
}) {
  const [warmupStatus, setWarmupStatus] = useState<Record<string, string>>({});

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

  const warmup = useCallback(async (driverId: string) => {
    setWarmupStatus((s) => ({ ...s, [driverId]: 'warming' }));
    try {
      const res = await fetch('/api/v1/drivers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'warmup', driverId }),
      });
      const data = await res.json();
      if (data.success) {
        setDrivers(drivers.map((d) => d.id === driverId ? { ...d, status: 'connected' } : d));
        setWarmupStatus((s) => ({ ...s, [driverId]: `✓ Ready (${(data.inferenceTimeMs / 1000).toFixed(1)}s)` }));
      } else {
        setWarmupStatus((s) => ({ ...s, [driverId]: `✗ ${data.error}` }));
      }
    } catch (err) {
      setWarmupStatus((s) => ({ ...s, [driverId]: '✗ Failed' }));
    }
    // Clear status after 5s
    setTimeout(() => setWarmupStatus((s) => ({ ...s, [driverId]: '' })), 5000);
  }, [drivers, setDrivers]);

  const localDrivers = drivers.filter((d) => ['lmstudio', 'ollama', 'custom'].includes(d.provider));
  const cloudDrivers = drivers.filter((d) => !['lmstudio', 'ollama', 'custom'].includes(d.provider));

  return (
    <div className="space-y-4">
      <SectionHeader title="Local Models (LM Studio / Ollama)" />
      <p className="text-gray-500 text-[10px]">
        Connect to local models via OpenAI-compatible API. Start LM Studio or Ollama, load a model, then <strong>Warm Up</strong> to preload.
      </p>
      {localDrivers.map((d) => (
        <div key={d.id}>
          <DriverCard driver={d} onCheckHealth={checkHealth} onToggle={toggleEnabled} onWarmup={warmup} />
          {warmupStatus[d.id] && (
            <div className={`text-[10px] mt-1 px-2 ${warmupStatus[d.id].startsWith('✓') ? 'text-green-400' : warmupStatus[d.id].startsWith('✗') ? 'text-red-400' : 'text-orange-400'}`}>
              {warmupStatus[d.id]}
            </div>
          )}
        </div>
      ))}

      <SectionHeader title="Cloud Models (API Key Required)" />
      {cloudDrivers.map((d) => (
        <DriverCard key={d.id} driver={d} onCheckHealth={checkHealth} onToggle={toggleEnabled} onWarmup={warmup} />
      ))}

      <div className="mt-2 p-3 bg-gray-900 rounded-lg border border-gray-800 text-[10px] text-gray-500 space-y-1">
        <p><strong>🏠 LM Studio:</strong> Start server → load <code>nemotron-3-nano</code> → endpoint: <code>http://localhost:1234/v1</code></p>
        <p><strong>🦙 Ollama:</strong> <code>ollama serve</code> → <code>ollama run llama3.3:70b</code> → endpoint: <code>http://localhost:11434/v1</code></p>
        <p><strong>☁️ Cloud:</strong> Set API key in driver config or use OpenRouter for multi-model access</p>
      </div>
    </div>
  );
}

function DriverCard({ driver, onCheckHealth, onToggle, onWarmup }: {
  driver: Driver;
  onCheckHealth: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onWarmup: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [warming, setWarming] = useState(false);
  const statusColors: Record<string, string> = {
    connected: 'bg-green-500', disconnected: 'bg-red-500', error: 'bg-orange-500', unchecked: 'bg-gray-500',
  };

  const handleWarmup = async () => {
    setWarming(true);
    await onWarmup(driver.id);
    setWarming(false);
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
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleWarmup} disabled={warming}
              className="px-3 py-1 text-[10px] bg-orange-900/50 text-orange-300 border border-orange-800 rounded hover:bg-orange-900 disabled:opacity-50">
              {warming ? '⏳ Warming...' : '🔥 Warm Up'}
            </button>
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

interface GameSettings {
  aiTimeoutMs: number;
  botThinkMinMs: number;
  botThinkMaxMs: number;
  showdownHoldMs: number;
  rebuyStack: number;
  smallBlind: number;
  bigBlind: number;
}

function ControlsTab({ gameState, onResetGame }: { gameState: PlayerGameView | null; onResetGame?: () => void }) {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/v1/settings').then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  const save = useCallback(async (patch: Partial<GameSettings>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const updated = await res.json();
      setSettings(updated);
    } catch { /* noop */ }
    setSaving(false);
  }, []);

  return (
    <div className="space-y-4">
      <SectionHeader title="Game Configuration" />
      {settings && (
        <div className="space-y-3">
          <ConfigSlider
            label="AI Timeout"
            value={settings.aiTimeoutMs}
            min={0} max={120000} step={1000}
            format={formatTimeout}
            unlimited
            unlimitedValue={0}
            onChange={(v) => save({ aiTimeoutMs: v })}
          />
          <ConfigSlider
            label="Bot Think (Min)"
            value={settings.botThinkMinMs}
            min={0} max={10000} step={100}
            format={formatMs}
            onChange={(v) => save({ botThinkMinMs: v })}
          />
          <ConfigSlider
            label="Bot Think (Max)"
            value={settings.botThinkMaxMs}
            min={0} max={10000} step={100}
            format={formatMs}
            onChange={(v) => save({ botThinkMaxMs: v })}
          />
          <ConfigSlider
            label="Showdown Hold"
            value={settings.showdownHoldMs}
            min={500} max={10000} step={250}
            format={formatMs}
            onChange={(v) => save({ showdownHoldMs: v })}
          />
          <ConfigSlider
            label="Rebuy Stack"
            value={settings.rebuyStack}
            min={100} max={10000} step={100}
            format={(v) => `$${v}`}
            onChange={(v) => save({ rebuyStack: v })}
          />
        </div>
      )}
      {saving && <div className="text-[10px] text-orange-400">Saving...</div>}

      <SectionHeader title="Game Controls" />
      <button onClick={onResetGame}
        className="w-full text-left p-3 rounded-lg border bg-red-900/30 border-red-800 hover:bg-red-900/60 text-red-400">
        <div className="font-semibold text-sm">Reset Game</div>
        <div className="text-[10px] opacity-60 mt-0.5">Reset all stacks, restart from hand 1</div>
      </button>

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
// Config Slider
// ============================================================

function ConfigSlider({ label, value, min, max, step, format, onChange, unlimited, unlimitedValue }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  unlimited?: boolean;
  unlimitedValue?: number;
}) {
  const isUnlimited = unlimited && value === (unlimitedValue ?? 0);
  const [local, setLocal] = useState(value);
  const [localUnlimited, setLocalUnlimited] = useState(isUnlimited);
  const commitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when external value changes
  useEffect(() => {
    setLocal(value);
    setLocalUnlimited(unlimited ? value === (unlimitedValue ?? 0) : false);
  }, [value, unlimited, unlimitedValue]);

  const commit = useCallback((v: number) => {
    if (commitRef.current) clearTimeout(commitRef.current);
    commitRef.current = setTimeout(() => onChange(v), 300);
  }, [onChange]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setLocal(v);
    setLocalUnlimited(false);
    commit(v);
  };

  const handleUnlimited = () => {
    const next = !localUnlimited;
    setLocalUnlimited(next);
    if (next) {
      commit(unlimitedValue ?? 0);
    } else {
      const fallback = max / 2;
      setLocal(fallback);
      commit(fallback);
    }
  };

  const displayValue = localUnlimited ? '∞ Unlimited' : format(local);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs text-white font-mono">{displayValue}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min || step} max={max} step={step}
          value={localUnlimited ? min || step : local}
          onChange={handleSlider}
          disabled={localUnlimited}
          className="flex-1 h-1.5 appearance-none bg-gray-800 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500
            [&::-webkit-slider-thumb]:cursor-pointer disabled:opacity-30"
        />
        {unlimited && (
          <button
            onClick={handleUnlimited}
            className={`text-[9px] px-2 py-0.5 rounded border whitespace-nowrap ${
              localUnlimited
                ? 'bg-orange-900/50 text-orange-300 border-orange-700'
                : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
            }`}
          >
            ∞
          </button>
        )}
      </div>
    </div>
  );
}

function formatTimeout(ms: number): string {
  if (ms === 0) return '∞ Unlimited';
  return ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`;
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
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
