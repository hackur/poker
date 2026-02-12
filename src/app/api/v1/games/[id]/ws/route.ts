/**
 * WebSocket Upgrade Route
 * 
 * Upgrades HTTP connection to WebSocket and forwards to Durable Object.
 * Falls back to polling-compatible REST if WebSocket upgrade fails.
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// Type for the Durable Object namespace binding
interface DurableObjectNamespace {
  get(id: DurableObjectId): DurableObjectStub;
  idFromName(name: string): DurableObjectId;
  idFromString(hexId: string): DurableObjectId;
  newUniqueId(): DurableObjectId;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

// Cloudflare environment bindings
interface Env {
  GAME_SESSIONS_WORKER?: {
    fetch(request: Request): Promise<Response>;
  };
  GAME_SESSIONS?: DurableObjectNamespace;
}

// Get Cloudflare env from Next.js runtime
function getEnv(request: NextRequest): Env | null {
  // @ts-expect-error - Cloudflare runtime injects env
  const env = request.nextUrl?.env ?? (globalThis as { env?: Env }).env;
  return env ?? null;
}

/** GET /api/v1/games/[id]/ws - WebSocket upgrade or polling fallback */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: gameId } = await params;
  const playerId = request.nextUrl.searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
  }

  // Check for WebSocket upgrade
  const upgradeHeader = request.headers.get('upgrade');
  const isWebSocketRequest = upgradeHeader?.toLowerCase() === 'websocket';

  // Try to get Cloudflare environment
  const env = getEnv(request);

  // If we have the DO binding and it's a WebSocket request, forward to DO
  if (isWebSocketRequest && env?.GAME_SESSIONS) {
    try {
      // Get Durable Object stub for this game
      const doId = env.GAME_SESSIONS.idFromName(gameId);
      const stub = env.GAME_SESSIONS.get(doId);

      // Create the WebSocket upgrade request
      const url = new URL(request.url);
      url.searchParams.set('playerId', playerId);

      // Forward to Durable Object
      return await stub.fetch(
        new Request(url.toString(), {
          headers: request.headers,
        })
      );
    } catch (err) {
      console.error('[WS Route] DO error:', err);
      // Fall through to service worker or REST fallback
    }
  }

  // If we have the service binding, forward to worker
  if (isWebSocketRequest && env?.GAME_SESSIONS_WORKER) {
    try {
      const url = new URL(request.url);
      url.pathname = `/game/${gameId}/connect`;
      url.searchParams.set('playerId', playerId);

      return await env.GAME_SESSIONS_WORKER.fetch(
        new Request(url.toString(), {
          headers: request.headers,
        })
      );
    } catch (err) {
      console.error('[WS Route] Worker error:', err);
    }
  }

  // WebSocket not available in this environment
  if (isWebSocketRequest) {
    return new Response('WebSocket not supported in this environment', { 
      status: 426,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      }
    });
  }

  // REST fallback - redirect to regular table endpoint
  const tableUrl = new URL(`/api/v1/table/${gameId}`, request.url);
  return NextResponse.redirect(tableUrl);
}
