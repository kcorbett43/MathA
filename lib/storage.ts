import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  DurationMinutes,
  GameMode,
  SessionScore,
  TimeRange,
} from '@/lib/types';

const STORAGE_KEY = 'matha.scores.v1';

/** Serialize read-modify-write so overlapping saves cannot drop newer sessions. */
let writeChain: Promise<void> = Promise.resolve();

export async function loadScores(): Promise<SessionScore[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionScore[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSessionScore);
  } catch {
    return [];
  }
}

function isSessionScore(value: unknown): value is SessionScore {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<SessionScore>;
  return (
    typeof s.id === 'string' &&
    typeof s.mode === 'string' &&
    typeof s.durationMinutes === 'number' &&
    Number.isFinite(s.durationMinutes) &&
    typeof s.score === 'number' &&
    typeof s.attempted === 'number' &&
    typeof s.completedAt === 'string' &&
    Number.isFinite(new Date(s.completedAt).getTime())
  );
}

/**
 * Upsert a session by id. Writes are queued so rapid Try again / remounts
 * cannot overwrite a newer save with a stale snapshot (lost-update race).
 */
export async function saveScore(score: SessionScore): Promise<void> {
  const run = writeChain.then(async () => {
    const existing = await loadScores();
    const index = existing.findIndex((s) => s.id === score.id);
    if (index >= 0) {
      existing[index] = score;
    } else {
      existing.push(score);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  });
  // Keep the queue alive even if one write fails.
  writeChain = run.catch(() => undefined);
  await run;
}

export function createScoreId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function filterScores(
  scores: SessionScore[],
  mode: GameMode,
  range: TimeRange,
  durationMinutes: DurationMinutes,
  now = new Date(),
): SessionScore[] {
  const byModeDuration = scores.filter((s) => {
    if (s.mode !== mode || Number(s.durationMinutes) !== Number(durationMinutes)) {
      return false;
    }
    return Number.isFinite(new Date(s.completedAt).getTime());
  });
  if (range === 'all') return byModeDuration;

  const start = startOfLocalDay(now);
  if (range === 'day') {
    // keep start as today
  } else if (range === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (range === 'month') {
    start.setDate(start.getDate() - 29);
  } else if (range === 'year') {
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
  }

  const startMs = start.getTime();
  return byModeDuration.filter((s) => new Date(s.completedAt).getTime() >= startMs);
}

/** Most recent score by completedAt (invalid timestamps sort last). */
export function latestScore(scores: SessionScore[]): SessionScore | null {
  if (scores.length === 0) return null;
  let best: SessionScore | null = null;
  let bestMs = -Infinity;
  for (const s of scores) {
    const t = new Date(s.completedAt).getTime();
    if (!Number.isFinite(t)) continue;
    if (t >= bestMs) {
      bestMs = t;
      best = s;
    }
  }
  return best;
}

/** Calendar-day key YYYY-MM-DD in local time. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
