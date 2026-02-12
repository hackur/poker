import { DEFAULT_DRIVERS, type BotDriver } from './poker/bot-drivers';

// In-memory driver store (survives hot reloads via globalThis)
const g = globalThis as unknown as { __pokerDrivers?: BotDriver[] };
if (!g.__pokerDrivers) {
  g.__pokerDrivers = structuredClone(DEFAULT_DRIVERS);
}

export function getDrivers(): BotDriver[] {
  return g.__pokerDrivers!;
}
