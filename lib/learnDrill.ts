import type { ContentPack, GeneratorId } from '@/content/packs';
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
 * newCount = round(n × newShare); review fills the rest from reviewTopicTags.
 */
export function buildLearnDrillSequence(pack: ContentPack): GeneratorId[] {
  const { n, newShare, newTopicTags, reviewTopicTags } = pack.drill;
  if (n <= 0) return [];
  if (newTopicTags.length === 0) {
    throw new Error(`Pack ${pack.meta.id}: drill.newTopicTags must be non-empty`);
  }

  const clampedShare = Math.min(1, Math.max(0, newShare));
  const newCount = Math.round(n * clampedShare);
  const reviewCount = n - newCount;

  const slots: GeneratorId[] = [];

  for (let i = 0; i < newCount; i++) {
    slots.push(newTopicTags[i % newTopicTags.length]!);
  }

  if (reviewCount > 0) {
    if (reviewTopicTags.length === 0) {
      // Fallback: fill with new topic if author left review empty but newShare < 1
      for (let i = 0; i < reviewCount; i++) {
        slots.push(newTopicTags[i % newTopicTags.length]!);
      }
    } else {
      for (let i = 0; i < reviewCount; i++) {
        slots.push(pick(reviewTopicTags));
      }
    }
  }

  return shuffle(slots);
}

export function formatMixLabel(pack: ContentPack): string {
  const pct = Math.round(pack.drill.newShare * 100);
  const reviewPct = 100 - pct;
  if (reviewPct <= 0) {
    return `${pack.drill.n} questions · 100% new`;
  }
  return `${pack.drill.n} questions · ~${pct}/${reviewPct} new/review`;
}
