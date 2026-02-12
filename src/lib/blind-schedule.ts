/**
 * Phase 12: Blind Schedule Management
 * Configurable blind level progression for tournaments
 */

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
}

export interface BlindScheduleConfig {
  levels: BlindLevel[];
  breakAfterLevel?: number; // Insert break every N levels
  breakDurationMinutes?: number;
}

// Preset blind schedules
export const TURBO_SCHEDULE: BlindLevel[] = [
  { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, durationMinutes: 5 },
  { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, durationMinutes: 5 },
  { level: 3, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 5 },
  { level: 4, smallBlind: 50, bigBlind: 100, ante: 10, durationMinutes: 5 },
  { level: 5, smallBlind: 75, bigBlind: 150, ante: 15, durationMinutes: 5 },
  { level: 6, smallBlind: 100, bigBlind: 200, ante: 25, durationMinutes: 5 },
  { level: 7, smallBlind: 150, bigBlind: 300, ante: 30, durationMinutes: 5 },
  { level: 8, smallBlind: 200, bigBlind: 400, ante: 50, durationMinutes: 5 },
  { level: 9, smallBlind: 300, bigBlind: 600, ante: 75, durationMinutes: 5 },
  { level: 10, smallBlind: 500, bigBlind: 1000, ante: 100, durationMinutes: 5 },
];

export const STANDARD_SCHEDULE: BlindLevel[] = [
  { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, durationMinutes: 15 },
  { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, durationMinutes: 15 },
  { level: 3, smallBlind: 20, bigBlind: 40, ante: 0, durationMinutes: 15 },
  { level: 4, smallBlind: 30, bigBlind: 60, ante: 0, durationMinutes: 15 },
  { level: 5, smallBlind: 50, bigBlind: 100, ante: 10, durationMinutes: 15 },
  { level: 6, smallBlind: 75, bigBlind: 150, ante: 15, durationMinutes: 15 },
  { level: 7, smallBlind: 100, bigBlind: 200, ante: 25, durationMinutes: 15 },
  { level: 8, smallBlind: 150, bigBlind: 300, ante: 30, durationMinutes: 15 },
  { level: 9, smallBlind: 200, bigBlind: 400, ante: 50, durationMinutes: 15 },
  { level: 10, smallBlind: 300, bigBlind: 600, ante: 75, durationMinutes: 15 },
  { level: 11, smallBlind: 400, bigBlind: 800, ante: 100, durationMinutes: 15 },
  { level: 12, smallBlind: 500, bigBlind: 1000, ante: 100, durationMinutes: 15 },
  { level: 13, smallBlind: 750, bigBlind: 1500, ante: 150, durationMinutes: 15 },
  { level: 14, smallBlind: 1000, bigBlind: 2000, ante: 200, durationMinutes: 15 },
  { level: 15, smallBlind: 1500, bigBlind: 3000, ante: 300, durationMinutes: 15 },
];

export const DEEP_STACK_SCHEDULE: BlindLevel[] = [
  { level: 1, smallBlind: 5, bigBlind: 10, ante: 0, durationMinutes: 20 },
  { level: 2, smallBlind: 10, bigBlind: 20, ante: 0, durationMinutes: 20 },
  { level: 3, smallBlind: 15, bigBlind: 30, ante: 0, durationMinutes: 20 },
  { level: 4, smallBlind: 20, bigBlind: 40, ante: 0, durationMinutes: 20 },
  { level: 5, smallBlind: 25, bigBlind: 50, ante: 5, durationMinutes: 20 },
  { level: 6, smallBlind: 50, bigBlind: 100, ante: 10, durationMinutes: 20 },
  { level: 7, smallBlind: 75, bigBlind: 150, ante: 15, durationMinutes: 20 },
  { level: 8, smallBlind: 100, bigBlind: 200, ante: 25, durationMinutes: 20 },
  { level: 9, smallBlind: 150, bigBlind: 300, ante: 30, durationMinutes: 20 },
  { level: 10, smallBlind: 200, bigBlind: 400, ante: 50, durationMinutes: 20 },
  { level: 11, smallBlind: 300, bigBlind: 600, ante: 75, durationMinutes: 20 },
  { level: 12, smallBlind: 400, bigBlind: 800, ante: 100, durationMinutes: 20 },
];

export class BlindScheduleManager {
  private config: BlindScheduleConfig;
  private currentLevelIndex: number = 0;
  private levelStartTime: number = 0;
  private isPaused: boolean = false;
  private pauseTimeRemaining: number = 0;

  constructor(config: BlindScheduleConfig) {
    this.config = config;
  }

  static fromPreset(preset: 'turbo' | 'standard' | 'deep-stack'): BlindScheduleManager {
    const levels = {
      turbo: TURBO_SCHEDULE,
      standard: STANDARD_SCHEDULE,
      'deep-stack': DEEP_STACK_SCHEDULE,
    }[preset];
    return new BlindScheduleManager({
      levels,
      breakAfterLevel: preset === 'deep-stack' ? 4 : undefined,
      breakDurationMinutes: 5,
    });
  }

  static custom(levels: BlindLevel[]): BlindScheduleManager {
    return new BlindScheduleManager({ levels });
  }

  start(): void {
    this.levelStartTime = Date.now();
    this.currentLevelIndex = 0;
  }

  getCurrentLevel(): BlindLevel {
    return this.config.levels[Math.min(this.currentLevelIndex, this.config.levels.length - 1)];
  }

  getNextLevel(): BlindLevel | null {
    const nextIdx = this.currentLevelIndex + 1;
    if (nextIdx >= this.config.levels.length) return null;
    return this.config.levels[nextIdx];
  }

  getTimeRemainingMs(): number {
    if (this.isPaused) return this.pauseTimeRemaining;
    const level = this.getCurrentLevel();
    const elapsed = Date.now() - this.levelStartTime;
    const durationMs = level.durationMinutes * 60 * 1000;
    return Math.max(0, durationMs - elapsed);
  }

  /**
   * Check if it's time to advance. Returns true if level changed.
   */
  tick(): boolean {
    if (this.isPaused) return false;
    if (this.getTimeRemainingMs() <= 0) {
      return this.advanceLevel();
    }
    return false;
  }

  advanceLevel(): boolean {
    if (this.currentLevelIndex >= this.config.levels.length - 1) return false;
    this.currentLevelIndex++;
    this.levelStartTime = Date.now();
    return true;
  }

  pause(): void {
    this.pauseTimeRemaining = this.getTimeRemainingMs();
    this.isPaused = true;
  }

  resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    const level = this.getCurrentLevel();
    const durationMs = level.durationMinutes * 60 * 1000;
    this.levelStartTime = Date.now() - (durationMs - this.pauseTimeRemaining);
  }

  isBreakTime(): boolean {
    if (!this.config.breakAfterLevel) return false;
    return this.currentLevelIndex > 0 && this.currentLevelIndex % this.config.breakAfterLevel === 0;
  }

  getLevelIndex(): number {
    return this.currentLevelIndex;
  }

  getAllLevels(): BlindLevel[] {
    return [...this.config.levels];
  }

  getState(): {
    currentLevel: BlindLevel;
    nextLevel: BlindLevel | null;
    levelIndex: number;
    timeRemainingMs: number;
    isPaused: boolean;
    isBreak: boolean;
  } {
    return {
      currentLevel: this.getCurrentLevel(),
      nextLevel: this.getNextLevel(),
      levelIndex: this.currentLevelIndex,
      timeRemainingMs: this.getTimeRemainingMs(),
      isPaused: this.isPaused,
      isBreak: this.isBreakTime(),
    };
  }
}
