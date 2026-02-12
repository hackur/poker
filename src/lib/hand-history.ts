// ============================================================
// Hand History — Records completed hands for review
// Uses globalThis singleton to survive HMR and module boundaries
// ============================================================

export interface HandRecord {
  gameId: string;
  handNumber: number;
  timestamp: number;
  blinds: { small: number; big: number };
  players: HandPlayer[];
  actions: HandAction[];
  communityCards: { rank: number; suit: string }[];
  winners: { seat: number; name: string; amount: number; handName?: string }[];
  pot: number;
}

export interface HandPlayer {
  seat: number;
  name: string;
  isBot: boolean;
  botModel?: string;
  startStack: number;
  endStack: number;
  holeCards?: { rank: number; suit: string }[];
  isDealer: boolean;
}

export interface HandAction {
  seat: number;
  name: string;
  street: string;
  action: string;
  amount?: number;
  timestamp: number;
}

// Access the SAME array from any module boundary
const KEY = '__pokerHandHistory__';
function store(): HandRecord[] {
  const g = globalThis as Record<string, unknown>;
  if (!Array.isArray(g[KEY])) g[KEY] = [];
  return g[KEY] as HandRecord[];
}

export function getHandHistory(): HandRecord[] {
  return store();
}

export function addHandRecord(record: HandRecord): void {
  const s = store();
  s.unshift(record);
  if (s.length > 200) s.pop();
}

export function clearHandHistory(): void {
  store().length = 0;
}
