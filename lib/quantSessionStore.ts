import type { QuantReviewItem, QuantSkillId } from '@/lib/quantTypes';

/**
 * In-memory handoff from Quant session → review.
 * Not persisted; abandon (Home mid-session) writes nothing to the dashboard.
 * Kept until the next session overwrites it (safe under React Strict Mode remounts).
 */
type QuantSessionPayload = {
  /** Practice skill id (also set for Learn as the unit’s primary new topic). */
  skillId: QuantSkillId;
  /** When set, session came from a Learn pack drill. */
  packId?: string;
  items: QuantReviewItem[];
};

let lastSession: QuantSessionPayload | null = null;

export function setQuantReview(payload: QuantSessionPayload): void {
  lastSession = payload;
}

export function getQuantReview(): QuantSessionPayload | null {
  return lastSession;
}
