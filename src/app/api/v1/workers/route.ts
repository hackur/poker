import { NextResponse } from 'next/server';
import { 
  listWorkers, 
  getPoolStats,
  clearWorkers,
} from '@/lib/bot-worker-pool';
import { getBotPlayerById } from '@/lib/bot-player';

/** GET /api/v1/workers — List all workers and pool stats */
export async function GET() {
  const workers = listWorkers();
  const stats = getPoolStats();
  
  // Enrich workers with bot info
  const enrichedWorkers = workers.map(w => {
    const bot = getBotPlayerById(w.botPlayerId);
    return {
      workerId: w.workerId,
      botPlayerId: w.botPlayerId,
      botName: bot?.displayName ?? 'Unknown',
      botStyle: bot?.personality.style ?? 'unknown',
      sessionId: w.sessionId,
      status: w.status,
      lastActivity: w.lastActivity,
      decisionCount: w.decisionCount,
      avgInferenceMs: w.decisionCount > 0 
        ? Math.round(w.totalInferenceMs / w.decisionCount) 
        : 0,
    };
  });
  
  return NextResponse.json({
    workers: enrichedWorkers,
    stats,
  });
}

/** DELETE /api/v1/workers — Clear all workers */
export async function DELETE() {
  clearWorkers();
  return NextResponse.json({ cleared: true });
}
