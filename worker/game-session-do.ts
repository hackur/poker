// ============================================================
// Game Session Durable Object
//
// Holds live game state for a poker table.
// - WebSocket connections for real-time updates
// - Server-authoritative game logic
// - Persists hand history to storage
// ============================================================

import type { DurableObjectState } from '@cloudflare/workers-types';

// ============================================================
// Types (simplified for DO - full types in main app)
// ============================================================

type Suit = 'h' | 'd' | 'c' | 's';
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

interface Card {
  rank: Rank;
  suit: Suit;
}

type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

interface PlayerAction {
  type: ActionType;
  amount?: number;
}

interface ValidAction {
  type: ActionType;
  minAmount?: number;
  maxAmount?: number;
}

interface Player {
  id: string;
  name: string;
  seat: number;
  stack: number;
  holeCards: Card[];
  currentBet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  isBot: boolean;
  botModel?: string;
  sessionId?: string;
  hasActedThisRound: boolean;
}

interface Pot {
  amount: number;
  eligible: string[];
}

type GamePhase = 'waiting' | 'dealing' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

interface GameState {
  id: string;
  gameId: string;
  players: Player[];
  communityCards: Card[];
  pots: Pot[];
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  activePlayerIndex: number;
  phase: GamePhase;
  handNumber: number;
  handId: string;
  deck: Card[];
  deckIndex: number;
  isActive: boolean;
  smallBlind: number;
  bigBlind: number;
  lastAction?: { seat: number; action: ActionType; amount?: number };
  winners?: { seat: number; amount: number; handName?: string }[];
}

interface PublicPlayerInfo {
  id: string;
  name: string;
  seat: number;
  stack: number;
  currentBet: number;
  folded: boolean;
  allIn: boolean;
  isBot: boolean;
  botModel?: string;
  hasCards: boolean;
  isActive: boolean;
  showCards?: Card[];
}

interface PlayerGameView {
  id: string;
  gameId: string;
  handId: string;
  phase: GamePhase;
  players: PublicPlayerInfo[];
  communityCards: Card[];
  pots: Pot[];
  currentBet: number;
  dealerSeat: number;
  activePlayerSeat: number | null;
  myCards: Card[];
  mySeat: number;
  myStack: number;
  validActions: ValidAction[];
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
  lastAction?: { seat: number; action: ActionType; amount?: number };
  winners?: { seat: number; amount: number; handName?: string }[];
  showdownHands?: { seat: number; cards: Card[]; handName: string }[];
}

// WebSocket message types
type WSMessageType = 
  | 'join'
  | 'leave'
  | 'action'
  | 'state'
  | 'error'
  | 'player_joined'
  | 'player_left'
  | 'action_result'
  | 'hand_complete';

interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  playerId?: string;
  timestamp: number;
}

interface ConnectedClient {
  socket: WebSocket;
  playerId: string;
  joinedAt: number;
}

// ============================================================
// Durable Object Class
// ============================================================

export class GameSessionDO {
  private state: DurableObjectState;
  private gameState: GameState | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;
  private showdownUntil: number = 0;

  constructor(state: DurableObjectState) {
    this.state = state;
    // Load persisted state on construction
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<GameState>('gameState');
      if (stored) {
        this.gameState = stored;
        console.log(`[GameSessionDO] Loaded game state: hand #${stored.handNumber}`);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request, url);
    }

    // REST API fallback
    switch (request.method) {
      case 'GET':
        if (path.endsWith('/state')) {
          return this.handleGetState(url);
        }
        break;
      case 'POST':
        if (path.endsWith('/action')) {
          return this.handleAction(request);
        }
        if (path.endsWith('/create')) {
          return this.handleCreate(request);
        }
        if (path.endsWith('/join')) {
          return this.handleJoin(request);
        }
        if (path.endsWith('/leave')) {
          return this.handleLeave(request);
        }
        break;
    }

    return new Response('Not found', { status: 404 });
  }

  // ============================================================
  // WebSocket Handler
  // ============================================================

  private handleWebSocket(request: Request, url: URL): Response {
    const playerId = url.searchParams.get('playerId');
    if (!playerId) {
      return new Response('Missing playerId', { status: 400 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket
    this.state.acceptWebSocket(server);

    // Store client info
    this.clients.set(playerId, {
      socket: server,
      playerId,
      joinedAt: Date.now(),
    });

    // Send current state to the new client
    if (this.gameState) {
      const view = this.getPlayerView(playerId);
      server.send(JSON.stringify({
        type: 'state',
        payload: view,
        timestamp: Date.now(),
      } satisfies WSMessage));
    }

    // Broadcast player joined
    this.broadcast({
      type: 'player_joined',
      payload: { playerId },
      timestamp: Date.now(),
    }, playerId);

    // Start tick loop if not running
    this.startTickLoop();

    console.log(`[GameSessionDO] Player ${playerId} connected via WebSocket`);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    try {
      const data = JSON.parse(message as string) as WSMessage;
      const client = this.findClientBySocket(ws);
      
      if (!client) {
        ws.send(JSON.stringify({ type: 'error', payload: 'Unknown client', timestamp: Date.now() }));
        return;
      }

      switch (data.type) {
        case 'action':
          this.processAction(client.playerId, data.payload as PlayerAction);
          break;
        case 'leave':
          this.handlePlayerLeave(client.playerId);
          break;
      }
    } catch (err) {
      console.error('[GameSessionDO] WebSocket message error:', err);
      ws.send(JSON.stringify({ type: 'error', payload: 'Invalid message', timestamp: Date.now() }));
    }
  }

  webSocketClose(ws: WebSocket): void {
    const client = this.findClientBySocket(ws);
    if (client) {
      this.clients.delete(client.playerId);
      this.broadcast({
        type: 'player_left',
        payload: { playerId: client.playerId },
        timestamp: Date.now(),
      });
      console.log(`[GameSessionDO] Player ${client.playerId} disconnected`);
    }

    // Stop tick loop if no clients
    if (this.clients.size === 0 && this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  webSocketError(ws: WebSocket, error: unknown): void {
    console.error('[GameSessionDO] WebSocket error:', error);
    this.webSocketClose(ws);
  }

  private findClientBySocket(ws: WebSocket): ConnectedClient | undefined {
    for (const client of this.clients.values()) {
      if (client.socket === ws) return client;
    }
    return undefined;
  }

  // ============================================================
  // REST Handlers
  // ============================================================

  private async handleGetState(url: URL): Promise<Response> {
    const playerId = url.searchParams.get('playerId');
    if (!playerId) {
      return Response.json({ error: 'Missing playerId' }, { status: 400 });
    }

    if (!this.gameState) {
      return Response.json({ error: 'No game' }, { status: 404 });
    }

    const view = this.getPlayerView(playerId);
    return Response.json(view);
  }

  private async handleCreate(request: Request): Promise<Response> {
    const body = await request.json() as {
      gameId: string;
      smallBlind?: number;
      bigBlind?: number;
      players: Array<{
        id: string;
        name: string;
        stack: number;
        isBot: boolean;
        botModel?: string;
      }>;
    };

    if (this.gameState) {
      return Response.json({ error: 'Game already exists' }, { status: 400 });
    }

    // Create initial game state
    this.gameState = this.createInitialState(body);
    
    // Persist
    await this.state.storage.put('gameState', this.gameState);

    return Response.json({ success: true, gameId: this.gameState.gameId });
  }

  private async handleJoin(request: Request): Promise<Response> {
    const body = await request.json() as {
      playerId: string;
      name: string;
      stack?: number;
    };

    if (!this.gameState) {
      return Response.json({ error: 'No game' }, { status: 404 });
    }

    // Check if already in game
    const existing = this.gameState.players.find(p => p.id === body.playerId);
    if (existing) {
      return Response.json({ success: true, seat: existing.seat });
    }

    // Find empty seat
    const usedSeats = new Set(this.gameState.players.map(p => p.seat));
    let seat = 0;
    while (usedSeats.has(seat) && seat < 9) seat++;
    if (seat >= 9) {
      return Response.json({ error: 'Table full' }, { status: 400 });
    }

    // Add player
    const newPlayer: Player = {
      id: body.playerId,
      name: body.name,
      seat,
      stack: body.stack ?? 1000,
      holeCards: [],
      currentBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      isBot: false,
      hasActedThisRound: false,
    };

    this.gameState.players.push(newPlayer);
    this.gameState.players.sort((a, b) => a.seat - b.seat);

    // Persist
    await this.state.storage.put('gameState', this.gameState);

    // Broadcast
    this.broadcastState();

    return Response.json({ success: true, seat });
  }

  private async handleLeave(request: Request): Promise<Response> {
    const body = await request.json() as { playerId: string };
    
    if (!this.gameState) {
      return Response.json({ success: true });
    }

    await this.handlePlayerLeave(body.playerId);
    return Response.json({ success: true });
  }

  private async handleAction(request: Request): Promise<Response> {
    const body = await request.json() as {
      playerId: string;
      action: PlayerAction;
    };

    const result = this.processAction(body.playerId, body.action);
    
    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const view = this.getPlayerView(body.playerId);
    return Response.json(view);
  }

  // ============================================================
  // Game Logic
  // ============================================================

  private createInitialState(opts: {
    gameId: string;
    smallBlind?: number;
    bigBlind?: number;
    players: Array<{
      id: string;
      name: string;
      stack: number;
      isBot: boolean;
      botModel?: string;
    }>;
  }): GameState {
    const smallBlind = opts.smallBlind ?? 5;
    const bigBlind = opts.bigBlind ?? 10;

    const players: Player[] = opts.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      seat: i,
      stack: p.stack,
      holeCards: [],
      currentBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      isBot: p.isBot,
      botModel: p.botModel,
      hasActedThisRound: false,
    }));

    return {
      id: opts.gameId,
      gameId: crypto.randomUUID(),
      players,
      communityCards: [],
      pots: [{ amount: 0, eligible: players.map(p => p.id) }],
      currentBet: 0,
      minRaise: bigBlind,
      dealerSeat: 0,
      activePlayerIndex: -1,
      phase: 'waiting',
      handNumber: 0,
      handId: crypto.randomUUID(),
      deck: [],
      deckIndex: 0,
      isActive: true,
      smallBlind,
      bigBlind,
    };
  }

  private processAction(playerId: string, action: PlayerAction): { success: boolean; error?: string } {
    if (!this.gameState) {
      return { success: false, error: 'No game' };
    }

    const state = this.gameState;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's this player's turn
    const activePlayer = state.players[state.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Validate and execute action
    const validActions = this.getValidActions(playerId);
    const isValid = validActions.some(va => {
      if (va.type !== action.type) return false;
      if (action.amount !== undefined) {
        if (va.minAmount !== undefined && action.amount < va.minAmount) return false;
        if (va.maxAmount !== undefined && action.amount > va.maxAmount) return false;
      }
      return true;
    });

    if (!isValid) {
      return { success: false, error: 'Invalid action' };
    }

    // Execute the action
    this.executeAction(player, action);

    // Persist state
    this.state.storage.put('gameState', this.gameState);

    // Broadcast updated state
    this.broadcastState();

    return { success: true };
  }

  private executeAction(player: Player, action: PlayerAction): void {
    const state = this.gameState!;

    switch (action.type) {
      case 'fold':
        player.folded = true;
        break;

      case 'check':
        // Nothing to do
        break;

      case 'call': {
        const callAmount = Math.min(state.currentBet - player.currentBet, player.stack);
        player.currentBet += callAmount;
        player.totalBet += callAmount;
        player.stack -= callAmount;
        state.pots[0].amount += callAmount;
        if (player.stack === 0) player.allIn = true;
        break;
      }

      case 'bet':
      case 'raise': {
        const amount = action.amount ?? state.bigBlind;
        const raiseAmount = amount - player.currentBet;
        player.currentBet = amount;
        player.totalBet += raiseAmount;
        player.stack -= raiseAmount;
        state.pots[0].amount += raiseAmount;
        state.currentBet = amount;
        state.minRaise = Math.max(state.minRaise, amount - (state.currentBet - state.minRaise));
        if (player.stack === 0) player.allIn = true;
        
        // Reset hasActed for other players (they need to respond to raise)
        for (const p of state.players) {
          if (p.id !== player.id && !p.folded && !p.allIn) {
            p.hasActedThisRound = false;
          }
        }
        break;
      }

      case 'all_in': {
        const allInAmount = player.stack;
        player.currentBet += allInAmount;
        player.totalBet += allInAmount;
        state.pots[0].amount += allInAmount;
        player.stack = 0;
        player.allIn = true;
        if (player.currentBet > state.currentBet) {
          state.currentBet = player.currentBet;
          // Reset hasActed for others
          for (const p of state.players) {
            if (p.id !== player.id && !p.folded && !p.allIn) {
              p.hasActedThisRound = false;
            }
          }
        }
        break;
      }
    }

    player.hasActedThisRound = true;
    state.lastAction = { seat: player.seat, action: action.type, amount: action.amount };

    // Advance to next player or phase
    this.advanceGame();
  }

  private advanceGame(): void {
    const state = this.gameState!;

    // Find next active player
    const activePlayers = state.players.filter(p => !p.folded && !p.allIn);
    
    // Check for hand end conditions
    const foldedOut = activePlayers.length <= 1;
    const allActed = activePlayers.every(p => p.hasActedThisRound && p.currentBet === state.currentBet);

    if (foldedOut) {
      // Hand is over
      this.endHand();
      return;
    }

    if (allActed) {
      // Advance to next street
      this.advanceStreet();
      return;
    }

    // Find next player to act
    let nextIdx = (state.activePlayerIndex + 1) % state.players.length;
    let checked = 0;
    while (checked < state.players.length) {
      const p = state.players[nextIdx];
      if (!p.folded && !p.allIn && (!p.hasActedThisRound || p.currentBet < state.currentBet)) {
        state.activePlayerIndex = nextIdx;
        return;
      }
      nextIdx = (nextIdx + 1) % state.players.length;
      checked++;
    }

    // No one left to act - advance street
    this.advanceStreet();
  }

  private advanceStreet(): void {
    const state = this.gameState!;

    // Reset for new street
    for (const p of state.players) {
      p.currentBet = 0;
      p.hasActedThisRound = false;
    }
    state.currentBet = 0;
    state.minRaise = state.bigBlind;

    // Advance phase
    switch (state.phase) {
      case 'preflop':
        state.phase = 'flop';
        // Deal 3 community cards
        for (let i = 0; i < 3; i++) {
          state.communityCards.push(state.deck[state.deckIndex++]);
        }
        break;
      case 'flop':
        state.phase = 'turn';
        state.communityCards.push(state.deck[state.deckIndex++]);
        break;
      case 'turn':
        state.phase = 'river';
        state.communityCards.push(state.deck[state.deckIndex++]);
        break;
      case 'river':
        this.endHand();
        return;
    }

    // Find first player after dealer
    const dealerIdx = state.players.findIndex(p => p.seat === state.dealerSeat);
    let firstIdx = (dealerIdx + 1) % state.players.length;
    let checked = 0;
    while (checked < state.players.length) {
      const p = state.players[firstIdx];
      if (!p.folded && !p.allIn) {
        state.activePlayerIndex = firstIdx;
        return;
      }
      firstIdx = (firstIdx + 1) % state.players.length;
      checked++;
    }
  }

  private endHand(): void {
    const state = this.gameState!;
    state.phase = 'showdown';
    
    // Calculate winners (simplified - in real app, use hand evaluation)
    const activePlayers = state.players.filter(p => !p.folded);
    
    if (activePlayers.length === 1) {
      // Last player standing wins
      const winner = activePlayers[0];
      const amount = state.pots.reduce((sum, p) => sum + p.amount, 0);
      winner.stack += amount;
      state.winners = [{ seat: winner.seat, amount, handName: 'Last to fold' }];
    } else {
      // Showdown - would need hand evaluation here
      // For now, split pot evenly
      const pot = state.pots.reduce((sum, p) => sum + p.amount, 0);
      const share = Math.floor(pot / activePlayers.length);
      state.winners = activePlayers.map(p => {
        p.stack += share;
        return { seat: p.seat, amount: share, handName: 'Showdown' };
      });
    }

    // Set showdown hold time
    this.showdownUntil = Date.now() + 3000;

    // Broadcast final state
    this.broadcastState();

    // Persist
    this.state.storage.put('gameState', state);

    // Broadcast hand complete
    this.broadcast({
      type: 'hand_complete',
      payload: { winners: state.winners, handNumber: state.handNumber },
      timestamp: Date.now(),
    });
  }

  private getValidActions(playerId: string): ValidAction[] {
    const state = this.gameState;
    if (!state) return [];

    const player = state.players.find(p => p.id === playerId);
    if (!player || player.folded || player.allIn) return [];

    const actions: ValidAction[] = [];
    const toCall = state.currentBet - player.currentBet;

    // Can always fold (if facing a bet)
    if (toCall > 0) {
      actions.push({ type: 'fold' });
    }

    // Check if no bet to call
    if (toCall === 0) {
      actions.push({ type: 'check' });
    }

    // Call if there's a bet
    if (toCall > 0 && player.stack >= toCall) {
      actions.push({ type: 'call' });
    }

    // Bet (if no current bet)
    if (state.currentBet === 0 && player.stack >= state.bigBlind) {
      actions.push({
        type: 'bet',
        minAmount: state.bigBlind,
        maxAmount: player.stack,
      });
    }

    // Raise (if there's a current bet)
    if (state.currentBet > 0) {
      const minRaise = state.currentBet + state.minRaise;
      if (player.stack >= minRaise - player.currentBet) {
        actions.push({
          type: 'raise',
          minAmount: minRaise,
          maxAmount: player.stack + player.currentBet,
        });
      }
    }

    // All-in is always available if you have chips
    if (player.stack > 0) {
      actions.push({ type: 'all_in' });
    }

    return actions;
  }

  private getPlayerView(playerId: string): PlayerGameView | null {
    const state = this.gameState;
    if (!state) return null;

    const player = state.players.find(p => p.id === playerId);
    const activePlayer = state.players[state.activePlayerIndex];

    return {
      id: state.id,
      gameId: state.gameId,
      handId: state.handId,
      phase: state.phase,
      players: state.players.map(p => ({
        id: p.id,
        name: p.name,
        seat: p.seat,
        stack: p.stack,
        currentBet: p.currentBet,
        folded: p.folded,
        allIn: p.allIn,
        isBot: p.isBot,
        botModel: p.botModel,
        hasCards: p.holeCards.length > 0 && !p.folded,
        isActive: activePlayer?.id === p.id,
        showCards: state.phase === 'showdown' && !p.folded ? p.holeCards : undefined,
      })),
      communityCards: state.communityCards,
      pots: state.pots,
      currentBet: state.currentBet,
      dealerSeat: state.dealerSeat,
      activePlayerSeat: activePlayer?.seat ?? null,
      myCards: player?.holeCards ?? [],
      mySeat: player?.seat ?? -1,
      myStack: player?.stack ?? 0,
      validActions: player ? this.getValidActions(playerId) : [],
      handNumber: state.handNumber,
      smallBlind: state.smallBlind,
      bigBlind: state.bigBlind,
      lastAction: state.lastAction,
      winners: state.winners,
    };
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async handlePlayerLeave(playerId: string): Promise<void> {
    if (!this.gameState) return;

    const idx = this.gameState.players.findIndex(p => p.id === playerId);
    if (idx !== -1) {
      this.gameState.players.splice(idx, 1);
      await this.state.storage.put('gameState', this.gameState);
      this.broadcastState();
    }

    // Remove WebSocket client
    this.clients.delete(playerId);
  }

  private broadcast(message: WSMessage, excludePlayerId?: string): void {
    for (const [playerId, client] of this.clients) {
      if (playerId !== excludePlayerId) {
        try {
          client.socket.send(JSON.stringify(message));
        } catch (err) {
          console.error(`[GameSessionDO] Failed to send to ${playerId}:`, err);
        }
      }
    }
  }

  private broadcastState(): void {
    for (const [playerId, client] of this.clients) {
      const view = this.getPlayerView(playerId);
      if (view) {
        try {
          client.socket.send(JSON.stringify({
            type: 'state',
            payload: view,
            timestamp: Date.now(),
          } satisfies WSMessage));
        } catch (err) {
          console.error(`[GameSessionDO] Failed to send state to ${playerId}:`, err);
        }
      }
    }
  }

  // ============================================================
  // Tick Loop (for bot actions)
  // ============================================================

  private startTickLoop(): void {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      this.tick();
    }, 500);
  }

  private async tick(): Promise<void> {
    if (!this.gameState) return;
    const now = Date.now();

    // Wait for showdown
    if (now < this.showdownUntil) return;

    // Start new hand if in showdown
    if (this.gameState.phase === 'showdown' || this.gameState.phase === 'waiting') {
      if (this.showdownUntil > 0 && now >= this.showdownUntil) {
        await this.startNewHand();
      }
      return;
    }

    // Check for bot turn
    const activePlayer = this.gameState.players[this.gameState.activePlayerIndex];
    if (!activePlayer?.isBot) return;

    // Bot think time
    const elapsed = now - this.lastTickTime;
    if (elapsed < 1500) return;

    // Execute bot action (rule-based for now)
    const validActions = this.getValidActions(activePlayer.id);
    let action: PlayerAction;

    if (validActions.some(a => a.type === 'check')) {
      action = { type: 'check' };
    } else if (validActions.some(a => a.type === 'call')) {
      action = { type: 'call' };
    } else {
      action = { type: 'fold' };
    }

    this.processAction(activePlayer.id, action);
    this.lastTickTime = now;
  }

  private async startNewHand(): Promise<void> {
    const state = this.gameState!;

    // Reset players
    for (const p of state.players) {
      p.holeCards = [];
      p.currentBet = 0;
      p.totalBet = 0;
      p.folded = false;
      p.allIn = false;
      p.hasActedThisRound = false;

      // Rebuy if busted
      if (p.stack <= 0) {
        p.stack = 1000;
      }
    }

    // Reset game state
    state.communityCards = [];
    state.pots = [{ amount: 0, eligible: state.players.map(p => p.id) }];
    state.currentBet = 0;
    state.minRaise = state.bigBlind;
    state.winners = undefined;
    state.lastAction = undefined;
    state.handNumber++;
    state.handId = crypto.randomUUID();

    // Rotate dealer
    const currentDealerIdx = state.players.findIndex(p => p.seat === state.dealerSeat);
    const nextDealerIdx = (currentDealerIdx + 1) % state.players.length;
    state.dealerSeat = state.players[nextDealerIdx].seat;

    // Create and shuffle deck
    state.deck = this.createShuffledDeck();
    state.deckIndex = 0;

    // Deal hole cards
    for (const p of state.players) {
      p.holeCards = [state.deck[state.deckIndex++], state.deck[state.deckIndex++]];
    }

    // Post blinds
    const sbIdx = (nextDealerIdx + 1) % state.players.length;
    const bbIdx = (nextDealerIdx + 2) % state.players.length;

    const sbPlayer = state.players[sbIdx];
    const bbPlayer = state.players[bbIdx];

    const sbAmount = Math.min(state.smallBlind, sbPlayer.stack);
    sbPlayer.currentBet = sbAmount;
    sbPlayer.totalBet = sbAmount;
    sbPlayer.stack -= sbAmount;
    state.pots[0].amount += sbAmount;

    const bbAmount = Math.min(state.bigBlind, bbPlayer.stack);
    bbPlayer.currentBet = bbAmount;
    bbPlayer.totalBet = bbAmount;
    bbPlayer.stack -= bbAmount;
    state.pots[0].amount += bbAmount;

    state.currentBet = bbAmount;

    // Set first to act (player after BB)
    state.activePlayerIndex = (bbIdx + 1) % state.players.length;
    state.phase = 'preflop';

    // Reset showdown
    this.showdownUntil = 0;
    this.lastTickTime = Date.now();

    // Persist and broadcast
    await this.state.storage.put('gameState', state);
    this.broadcastState();

    console.log(`[GameSessionDO] Started hand #${state.handNumber}`);
  }

  private createShuffledDeck(): Card[] {
    const suits: Suit[] = ['h', 'd', 'c', 's'];
    const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit });
      }
    }

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }
}

export default {
  async fetch(): Promise<Response> {
    return new Response('Durable Object Worker');
  },
};
