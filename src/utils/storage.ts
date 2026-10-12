/**
 * Arena High Scores, Stats, and Performance History Storage Manager
 */

export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'insane';

export interface ReflexAttempt {
  ms: number;
  timestamp: number;
  rating: string;
  difficulty?: GameDifficulty;
}

export interface ArenaStats {
  reflexBest: number | null; // Lowest ms is best (overall/medium)
  reflexBestByDiff: Record<GameDifficulty, number | null>;
  reflexHistory: ReflexAttempt[];
  reflexLevelPeak: number;   // Highest level reached in Reflex Ladder
  memoryBest: number;        // Highest level reached
  mathBest: number;          // Highest blitz score (overall/medium)
  mathBestByDiff: Record<GameDifficulty, number>;
  mathBestStreak: number;
  mathLevelPeak: number;     // Highest level reached in Math Ladder
  stroopBest: number;        // Highest Stroop score
  chimpBest: number;         // Highest Chimp tiles remembered
  gauntletBest: number;      // Highest triathlon overall score
  totalGamesPlayed: number;
}

const STORAGE_KEY = 'arena_player_stats_v1';

const defaultStats: ArenaStats = {
  reflexBest: null,
  reflexBestByDiff: {
    easy: null,
    medium: null,
    hard: null,
    insane: null,
  },
  reflexHistory: [],
  reflexLevelPeak: 1,
  memoryBest: 0,
  mathBest: 0,
  mathBestByDiff: {
    easy: 0,
    medium: 0,
    hard: 0,
    insane: 0,
  },
  mathBestStreak: 0,
  mathLevelPeak: 1,
  stroopBest: 0,
  chimpBest: 0,
  gauntletBest: 0,
  totalGamesPlayed: 0,
};

export function loadArenaStats(): ArenaStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultStats };
    const parsed = JSON.parse(raw);
    return {
      ...defaultStats,
      ...parsed,
      reflexBestByDiff: {
        ...defaultStats.reflexBestByDiff,
        ...(parsed.reflexBestByDiff || {}),
      },
      mathBestByDiff: {
        ...defaultStats.mathBestByDiff,
        ...(parsed.mathBestByDiff || {}),
      },
    };
  } catch {
    return { ...defaultStats };
  }
}

export function saveArenaStats(stats: ArenaStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordReflexScore(
  ms: number,
  rating: string,
  difficulty: GameDifficulty = 'medium'
): { isNewBest: boolean; stats: ArenaStats } {
  const stats = loadArenaStats();
  stats.totalGamesPlayed += 1;

  const currentDiffBest = stats.reflexBestByDiff[difficulty];
  const isDiffNewBest = currentDiffBest === null || ms < currentDiffBest;
  if (isDiffNewBest) {
    stats.reflexBestByDiff[difficulty] = ms;
  }

  const isOverallNewBest = stats.reflexBest === null || ms < stats.reflexBest;
  if (isOverallNewBest) {
    stats.reflexBest = ms;
  }

  stats.reflexHistory = [
    { ms, timestamp: Date.now(), rating, difficulty },
    ...stats.reflexHistory.slice(0, 19), // Keep last 20 attempts
  ];

  saveArenaStats(stats);
  return { isNewBest: isDiffNewBest, stats };
}

export function recordMemoryScore(level: number): { isNewBest: boolean; stats: ArenaStats } {
  const stats = loadArenaStats();
  stats.totalGamesPlayed += 1;
  const isNewBest = level > stats.memoryBest;
  if (isNewBest) {
    stats.memoryBest = level;
  }
  saveArenaStats(stats);
  return { isNewBest, stats };
}

export function recordMathScore(
  score: number,
  streak: number,
  difficulty: GameDifficulty = 'medium'
): { isNewBest: boolean; stats: ArenaStats } {
  const stats = loadArenaStats();
  stats.totalGamesPlayed += 1;

  const currentDiffBest = stats.mathBestByDiff[difficulty] || 0;
  const isDiffNewBest = score > currentDiffBest;
  if (isDiffNewBest) {
    stats.mathBestByDiff[difficulty] = score;
  }

  const isOverallNewBest = score > stats.mathBest;
  if (isOverallNewBest) {
    stats.mathBest = score;
  }
  if (streak > stats.mathBestStreak) {
    stats.mathBestStreak = streak;
  }
  saveArenaStats(stats);
  return { isNewBest: isDiffNewBest, stats };
}

export function recordStroopScore(score: number): { isNewBest: boolean; stats: ArenaStats } {
  const stats = loadArenaStats();
  stats.totalGamesPlayed += 1;
  const isNewBest = score > stats.stroopBest;
  if (isNewBest) {
    stats.stroopBest = score;
  }
  saveArenaStats(stats);
  return { isNewBest, stats };
}

export function recordChimpScore(tiles: number): { isNewBest: boolean; stats: ArenaStats } {
  const stats = loadArenaStats();
  stats.totalGamesPlayed += 1;
  const isNewBest = tiles > stats.chimpBest;
  if (isNewBest) {
    stats.chimpBest = tiles;
  }
  saveArenaStats(stats);
  return { isNewBest, stats };
}

export function recordGauntletScore(score: number): { isNewBest: boolean; stats: ArenaStats } {
  const stats = loadArenaStats();
  stats.totalGamesPlayed += 1;
  const isNewBest = score > stats.gauntletBest;
  if (isNewBest) {
    stats.gauntletBest = score;
  }
  saveArenaStats(stats);
  return { isNewBest, stats };
}

export function recordReflexLevel(level: number): { isNewBest: boolean; stats: ArenaStats } {
  const stats = loadArenaStats();
  stats.totalGamesPlayed += 1;
  const isNewBest = level > (stats.reflexLevelPeak || 1);
  if (isNewBest) {
    stats.reflexLevelPeak = level;
  }
  saveArenaStats(stats);
  return { isNewBest, stats };
}

export function recordMathLevel(level: number): { isNewBest: boolean; stats: ArenaStats } {
  const stats = loadArenaStats();
  stats.totalGamesPlayed += 1;
  const isNewBest = level > (stats.mathLevelPeak || 1);
  if (isNewBest) {
    stats.mathLevelPeak = level;
  }
  saveArenaStats(stats);
  return { isNewBest, stats };
}

export function resetAllStats(): ArenaStats {
  saveArenaStats(defaultStats);
  return { ...defaultStats };
}
