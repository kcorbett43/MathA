import {
  resolveNewShare,
  resolveReviewTopicTags,
  RUNTIME_SPACED_REP_POLICY,
  type ContentPack,
  type GeneratorId,
  type SpacedRepPolicyId,
} from '@/content/packs';
import { pick } from '@/lib/random';

/** Fisher–Yates shuffle (mutates a copy). */
function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/**
 * Build an interleaved skill sequence for a Learn pack drill.
 * Policy defaults to `RUNTIME_SPACED_REP_POLICY` (`standard` = current mixes).
 */
export function buildLearnDrillSequence(
  pack: ContentPack,
  policy: SpacedRepPolicyId = RUNTIME_SPACED_REP_POLICY,
): GeneratorId[] {
  const { n, newTopicTags } = pack.drill;
  if (n <= 0) return [];
  if (newTopicTags.length === 0) {
    throw new Error(`Pack ${pack.meta.id}: drill.newTopicTags must be non-empty`);
  }

  const newShare = resolveNewShare(pack, policy);
  const reviewTopicTags = resolveReviewTopicTags(pack);

  let newCount = Math.round(n * newShare);
  let reviewCount = n - newCount;

  // No review pool → all new (e.g. first unit, or policy none with empty pool)
  if (reviewTopicTags.length === 0) {
    newCount = n;
    reviewCount = 0;
  }

  const slots: GeneratorId[] = [];

  for (let i = 0; i < newCount; i++) {
    slots.push(newTopicTags[i % newTopicTags.length]!);
  }

  for (let i = 0; i < reviewCount; i++) {
    slots.push(pick(reviewTopicTags));
  }

  return shuffle(slots);
}

export function formatMixLabel(
  pack: ContentPack,
  policy: SpacedRepPolicyId = RUNTIME_SPACED_REP_POLICY,
): string {
  const reviewPool = resolveReviewTopicTags(pack);
  const newShare = resolveNewShare(pack, policy);
  const pct = Math.round(newShare * 100);
  const reviewPct = 100 - pct;
  if (reviewPool.length === 0 || reviewPct <= 0) {
    return `${pack.drill.n} questions · 100% new`;
  }
  return `${pack.drill.n} questions · ~${pct}/${reviewPct} new/review`;
}
