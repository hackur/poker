import { NextResponse } from 'next/server';
import { 
  getAllBotPlayers, 
  getActiveBotPlayers,
  type BotPlayer 
} from '@/lib/bot-player';

/** GET /api/v1/bots — List bot players */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';
  
  const bots = activeOnly ? getActiveBotPlayers() : getAllBotPlayers();
  
  // Return public-safe view (no API keys)
  const safeBots = bots.map(b => ({
    id: b.id,
    slug: b.slug,
    displayName: b.displayName,
    avatarUrl: b.avatarUrl,
    style: b.personality.style,
    description: b.personality.description,
    deliberation: {
      enabled: b.deliberation.enabled,
      maxSteps: b.deliberation.maxSteps,
    },
    isActive: b.isActive,
  }));
  
  return NextResponse.json({
    bots: safeBots,
    count: safeBots.length,
  });
}
