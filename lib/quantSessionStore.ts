import type { QuantReviewItem, QuantSkillId } from '@/lib/quantTypes';

/**
 * In-memory handoff from Quant session → review.
 * Not persisted; abandon (Home mid-session) writes nothing to the dashboard.
 * Kept until the next session overwrites it (safe under React Strict Mode remounts).
 */
type QuantSessionPayload = {
  skillId: QuantSkillId;
  items: QuantReviewItem[];
};

let lastSession: QuantSessionPayload | null = null;

export function setQuantReview(payload: QuantSessionPayload): void {
  lastSession = payload;
}

export function getQuantReview(): QuantSessionPayload | null {
  return lastSession;
}
