'use client';

import { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useMediaQuery';
import { PokerTable } from './poker-table';
import { PokerTableWS } from './poker-table-ws';
import { MobilePokerTable } from './poker-table-mobile';
import { ChatPanel } from './chat-panel';

interface ResponsiveTableWrapperProps {
  tableId: string;
  playerId?: string;
  /** Use WebSocket for real-time updates (default: false for backward compatibility) */
  useWebSocket?: boolean;
}

export function ResponsiveTableWrapper({ 
  tableId, 
  playerId: propPlayerId,
  useWebSocket = true, // WebSocket with polling fallback (Phase 14B)
}: ResponsiveTableWrapperProps) {
  const { isDesktop } = useResponsive();
  const [playerId, setPlayerId] = useState<string | null>(propPlayerId ?? null);

  // Fetch current user session if playerId not provided
  useEffect(() => {
    if (propPlayerId) {
      setPlayerId(propPlayerId);
      return;
    }

    fetch('/api/v1/auth/session')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setPlayerId(d.user.id);
        }
      })
      .catch(() => {});
  }, [propPlayerId]);

  // Don't render until we have a playerId
  if (!playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--background))]">
        <div className="text-[hsl(var(--muted-foreground))]">Loading...</div>
      </div>
    );
  }

  // Use WebSocket-enabled component if flag is set
  if (useWebSocket) {
    return (
      <>
        {isDesktop ? (
          <PokerTableWS tableId={tableId} playerId={playerId} />
        ) : (
          // TODO: Create MobilePokerTableWS for mobile WebSocket support
          <MobilePokerTable tableId={tableId} />
        )}
        <ChatPanel tableId={tableId} />
      </>
    );
  }

  // Default: polling-based components
  return (
    <>
      {isDesktop ? (
        <PokerTable tableId={tableId} />
      ) : (
        <MobilePokerTable tableId={tableId} />
      )}
      <ChatPanel tableId={tableId} />
    </>
  );
}
