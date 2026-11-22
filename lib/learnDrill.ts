import {
  getPractice,
  resolveNewShare,
  resolveReviewTopicTags,
  RUNTIME_SPACED_REP_POLICY,
  type AuthoredQuestion,
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

export type PracticeSlot =
  | { kind: 'generated'; generatorId: GeneratorId }
  | { kind: 'authored'; question: AuthoredQuestion };

/**
 * Build an interleaved practice sequence (authored + generated).
 * Manual authored questions are included for self-mark sessions but skipped
 * when building auto-graded generator-heavy mixes if mix.authored is 0.
 */
export function buildPracticeSequence(
  pack: ContentPack,
  policy: SpacedRepPolicyId = RUNTIME_SPACED_REP_POLICY,
): PracticeSlot[] {
  const practice = getPractice(pack);
  if (!practice || practice.sessionSize <= 0) return [];

  const n = practice.sessionSize;
  const mixSum = practice.mix.authored + practice.mix.generated || 1;
  const authoredShare = practice.mix.authored / mixSum;
  let authoredCount = Math.round(n * authoredShare);
  let generatedCount = n - authoredCount;

  const autoQuestions = (practice.questions ?? []).filter((q) => q.answerType !== 'manual');
  const manualQuestions = (practice.questions ?? []).filter((q) => q.answerType === 'manual');
  const authoredPool = autoQuestions.length > 0 ? autoQuestions : practice.questions ?? [];

  if (authoredPool.length === 0) {
    generatedCount = n;
    authoredCount = 0;
  }
  if ((practice.generators?.length ?? 0) === 0) {
    authoredCount = n;
    generatedCount = 0;
  }

  const slots: PracticeSlot[] = [];

  for (let i = 0; i < authoredCount; i++) {
    const q = authoredPool[i % authoredPool.length]!;
    slots.push({ kind: 'authored', question: q });
  }

  // Generated slots — apply shipped SR among generators when available
  const newTopicTags = practice.generators ?? [];
  if (generatedCount > 0 && newTopicTags.length > 0) {
    const newShare = resolveNewShare(pack, policy);
    const reviewTopicTags = resolveReviewTopicTags(pack);
    let newCount = Math.round(generatedCount * newShare);
    let reviewCount = generatedCount - newCount;
    if (reviewTopicTags.length === 0) {
      newCount = generatedCount;
      reviewCount = 0;
    }
    for (let i = 0; i < newCount; i++) {
      slots.push({
        kind: 'generated',
        generatorId: newTopicTags[i % newTopicTags.length]!,
      });
    }
    for (let i = 0; i < reviewCount; i++) {
      slots.push({ kind: 'generated', generatorId: pick(reviewTopicTags) });
    }
  }

  // Append manuals at end for self-mark (not counted in sessionSize mix)
  for (const q of manualQuestions) {
    if (!slots.some((s) => s.kind === 'authored' && s.question.id === q.id)) {
      // Only auto-include manuals when authored share requested them via pool
    }
  }

  return shuffle(slots);
}

/**
 * @deprecated Prefer buildPracticeSequence. Returns generator ids only
 * (authored slots omitted) for legacy session code paths.
 */
export function buildLearnDrillSequence(
  pack: ContentPack,
  policy: SpacedRepPolicyId = RUNTIME_SPACED_REP_POLICY,
): GeneratorId[] {
  return buildPracticeSequence(pack, policy)
    .filter((s): s is Extract<PracticeSlot, { kind: 'generated' }> => s.kind === 'generated')
    .map((s) => s.generatorId);
}

export function formatMixLabel(
  pack: ContentPack,
  policy: SpacedRepPolicyId = RUNTIME_SPACED_REP_POLICY,
): string {
  const practice = getPractice(pack);
  if (!practice) return 'No practice';
  const n = practice.sessionSize;
  const mixSum = practice.mix.authored + practice.mix.generated || 1;
  const authoredPct = Math.round((practice.mix.authored / mixSum) * 100);
  const generatedPct = 100 - authoredPct;

  if ((practice.generators?.length ?? 0) === 0) {
    return `${n} questions · authored`;
  }
  if (authoredPct <= 0) {
    const reviewPool = resolveReviewTopicTags(pack);
    const newShare = resolveNewShare(pack, policy);
    const pct = Math.round(newShare * 100);
    const reviewPct = 100 - pct;
    if (reviewPool.length === 0 || reviewPct <= 0) {
      return `${n} questions · 100% generated`;
    }
    return `${n} questions · ~${pct}/${reviewPct} new/review`;
  }
  return `${n} questions · ~${authoredPct}/${generatedPct} authored/generated`;
}
