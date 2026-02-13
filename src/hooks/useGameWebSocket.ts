/**
 * WebSocket hook for real-time game state updates
 * 
 * Connects to the Durable Object via WebSocket for instant updates.
 * Falls back to polling if WebSocket unavailable.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlayerGameView, PlayerAction } from '@/lib/poker/types';

// ============================================================
// Types
// ============================================================

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WSMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

interface UseGameWebSocketOptions {
  gameId: string;
  playerId: string;
  enabled?: boolean;
  onStateUpdate?: (state: PlayerGameView) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseGameWebSocketResult {
  state: PlayerGameView | null;
  connectionState: ConnectionState;
  sendAction: (action: PlayerAction) => void;
  reconnect: () => void;
  latency: number;
}

// ============================================================
// Constants
// ============================================================

const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const PING_INTERVAL_MS = 30000;
const FALLBACK_POLL_INTERVAL_MS = 1000;

// ============================================================
// Hook
// ============================================================

export function useGameWebSocket(opts: UseGameWebSocketOptions): UseGameWebSocketResult {
  const {
    gameId,
    playerId,
    enabled = true,
    onStateUpdate,
    onError,
    onConnect,
    onDisconnect,
  } = opts;

  const [state, setState] = useState<PlayerGameView | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [latency, setLatency] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPingRef = useRef(0);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================
  // WebSocket URL
  // ============================================================

  const getWebSocketUrl = useCallback(() => {
    // In production, connect to the DO worker
    const isProduction = typeof window !== 'undefined' && 
      (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('jeremysarda.com'));
    
    if (isProduction) {
      // Connect to the DO worker deployed on Workers
      return `wss://poker-game-sessions.jeremy-1c5.workers.dev/ws?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}`;
    }
    
    // Local dev - try same-origin WS (will fail and fallback to polling)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/v1/games/${gameId}/ws?playerId=${encodeURIComponent(playerId)}`;
  }, [gameId, playerId]);

  // ============================================================
  // Connect
  // ============================================================

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnectionState('connecting');
    
    // Immediately do one poll so the UI renders fast while WS connects
    fallbackPoll();

    try {
      const url = getWebSocketUrl();
      console.log(`[WS] Connecting to ${url}`);
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setConnectionState('connected');
        reconnectDelayRef.current = RECONNECT_DELAY_MS;
        onConnect?.();

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingRef.current = Date.now();
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, PING_INTERVAL_MS);

        // Stop fallback polling
        if (fallbackPollRef.current) {
          clearInterval(fallbackPollRef.current);
          fallbackPollRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          
          switch (message.type) {
            case 'state':
              const gameState = message.payload as PlayerGameView;
              setState(gameState);
              onStateUpdate?.(gameState);
              break;

            case 'pong':
              setLatency(Date.now() - lastPingRef.current);
              break;

            case 'error':
              console.error('[WS] Server error:', message.payload);
              onError?.(new Error(String(message.payload)));
              break;

            case 'player_joined':
            case 'player_left':
            case 'action_result':
            case 'hand_complete':
              // These are info events - state update follows
              console.log(`[WS] Event: ${message.type}`, message.payload);
              break;
          }
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        // Log as warning since we have polling fallback
        console.warn('[WS] Connection unavailable (falling back to polling):', event);
        setConnectionState('error');
        onError?.(new Error('WebSocket error'));
      };

      ws.onclose = (event) => {
        console.log(`[WS] Closed: ${event.code} ${event.reason}`);
        setConnectionState('disconnected');
        onDisconnect?.();

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Schedule reconnect (with exponential backoff)
        if (enabled && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelayRef.current);

          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            MAX_RECONNECT_DELAY_MS
          );
        }

        // Start fallback polling
        if (enabled && !fallbackPollRef.current) {
          fallbackPollRef.current = setInterval(() => {
            fallbackPoll();
          }, FALLBACK_POLL_INTERVAL_MS);
        }
      };
    } catch (err) {
      console.error('[WS] Failed to connect:', err);
      setConnectionState('error');
      onError?.(err instanceof Error ? err : new Error(String(err)));

      // Try reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectDelayRef.current);
    }
  }, [getWebSocketUrl, enabled, onConnect, onDisconnect, onError, onStateUpdate]);

  // ============================================================
  // Fallback Polling
  // ============================================================

  const fallbackPoll = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/table/${gameId}?playerId=${encodeURIComponent(playerId)}`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
        onStateUpdate?.(data);
      }
    } catch (err) {
      console.error('[Poll] Error:', err);
    }
  }, [gameId, playerId, onStateUpdate]);

  // ============================================================
  // Disconnect
  // ============================================================

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (fallbackPollRef.current) {
      clearInterval(fallbackPollRef.current);
      fallbackPollRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  }, []);

  // ============================================================
  // Send Action
  // ============================================================

  const sendAction = useCallback((action: PlayerAction) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'action',
        payload: action,
        playerId,
        timestamp: Date.now(),
      }));
    } else {
      // Fallback to REST
      fetch(`/api/v1/table/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, playerId }),
      })
        .then(res => res.json())
        .then(data => {
          setState(data);
          onStateUpdate?.(data);
        })
        .catch(err => {
          console.error('[REST] Action error:', err);
          onError?.(err);
        });
    }
  }, [gameId, playerId, onStateUpdate, onError]);

  // ============================================================
  // Reconnect
  // ============================================================

  const reconnect = useCallback(() => {
    disconnect();
    reconnectDelayRef.current = RECONNECT_DELAY_MS;
    connect();
  }, [connect, disconnect]);

  // ============================================================
  // Effects
  // ============================================================

  // Initial poll to load game state immediately (don't wait for WS)
  useEffect(() => {
    if (enabled && gameId && playerId) {
      fallbackPoll();
    }
  }, [enabled, gameId, playerId, fallbackPoll]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Reconnect when gameId or playerId changes (skip initial mount — connect effect handles that)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (enabled) {
      reconnect();
    }
  }, [gameId, playerId]);

  return {
    state,
    connectionState,
    sendAction,
    reconnect,
    latency,
  };
}

export default useGameWebSocket;
