import {
  commitProgressSnapshot,
  getRuntimeProgress,
  progressKey,
  type ProgressStoreSnapshot,
} from '@/content/store';
import type { ProgressCardRow } from '@/content/store/types';

/** Anki-style self-ratings for Review flip study. */
export type CardRating = 'again' | 'hard' | 'good' | 'easy';

export const CARD_RATINGS: readonly CardRating[] = [
  'again',
  'hard',
  'good',
  'easy',
] as const;

export const CARD_RATING_LABELS: Record<CardRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

export type CardProgressData = {
  lastRating: CardRating;
  ratedAt: string;
  reps: number;
};

export function isCardRating(value: unknown): value is CardRating {
  return (
    value === 'again' || value === 'hard' || value === 'good' || value === 'easy'
  );
}

export function readCardProgressData(
  data: Record<string, unknown> | undefined,
): CardProgressData | null {
  if (!data) return null;
  if (!isCardRating(data.lastRating)) return null;
  const ratedAt = typeof data.ratedAt === 'string' ? data.ratedAt : null;
  const reps = typeof data.reps === 'number' && data.reps >= 0 ? data.reps : 0;
  if (!ratedAt) return null;
  return { lastRating: data.lastRating, ratedAt, reps };
}

function upsertCardRow(
  progress: ProgressStoreSnapshot,
  packageId: string,
  unitId: string,
  cardId: string,
  rating: CardRating,
  now: string,
): ProgressStoreSnapshot {
  const key = progressKey(packageId, unitId, cardId);
  const cards = [...progress.cards];
  const idx = cards.findIndex(
    (row) => progressKey(row.packageId, row.unitId, row.cardId) === key,
  );
  const prior = idx >= 0 ? readCardProgressData(cards[idx]!.data) : null;
  const nextData: CardProgressData = {
    lastRating: rating,
    ratedAt: now,
    reps: (prior?.reps ?? 0) + 1,
  };
  const row: ProgressCardRow = {
    packageId,
    unitId,
    cardId,
    data: nextData,
    updatedAt: now,
  };
  if (idx >= 0) {
    cards[idx] = row;
  } else {
    cards.push(row);
  }
  return { ...progress, cards };
}

/**
 * Record a self-rating for a Review card.
 * Keyed by (packageId, unitId, cardId). Scheduling (FSRS) is deferred —
 * this only stores the latest rating + a simple reps counter.
 */
export async function recordCardRating(args: {
  packageId: string;
  unitId: string;
  cardId: string;
  rating: CardRating;
  now?: string;
}): Promise<ProgressStoreSnapshot> {
  const now = args.now ?? new Date().toISOString();
  const next = upsertCardRow(
    getRuntimeProgress(),
    args.packageId,
    args.unitId,
    args.cardId,
    args.rating,
    now,
  );
  await commitProgressSnapshot(next);
  return next;
}
