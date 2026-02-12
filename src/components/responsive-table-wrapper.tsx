'use client';

import { useResponsive } from '@/hooks/useMediaQuery';
import { PokerTable } from './poker-table';
import { MobilePokerTable } from './poker-table-mobile';
import { ChatPanel } from './chat-panel';

interface ResponsiveTableWrapperProps {
  tableId: string;
}

export function ResponsiveTableWrapper({ tableId }: ResponsiveTableWrapperProps) {
  const { isDesktop } = useResponsive();

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
