import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameMode, SessionScore, TimeRange } from '@/lib/types';

const STORAGE_KEY = 'matha.scores.v1';

export async function loadScores(): Promise<SessionScore[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionScore[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveScore(score: SessionScore): Promise<void> {
  const existing = await loadScores();
  existing.push(score);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
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
  now = new Date(),
): SessionScore[] {
  const byMode = scores.filter((s) => s.mode === mode);
  if (range === 'all') return byMode;

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
  return byMode.filter((s) => new Date(s.completedAt).getTime() >= startMs);
}

/** Calendar-day key YYYY-MM-DD in local time. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
