import type {
  ContentPack,
  GeneratorId,
  PackId,
  SpacedRepPolicyId,
} from './types';
import {
  RUNTIME_SPACED_REP_POLICY,
  SPACED_REP_POLICIES,
} from './types';

import { packU1Dice } from './u1-dice';
import { packU2Urns } from './u2-urns';
import { packU3Ev } from './u3-ev';

export {
  CONTENT_PACK_SCHEMA_VERSION,
  RUNTIME_SPACED_REP_POLICY,
  SPACED_REP_POLICIES,
  type ContentPack,
  type GeneratorId,
  type PackDefinition,
  type PackDrill,
  type PackExample,
  type PackId,
  type PackLinks,
  type PackLesson,
  type PackMeta,
  type SpacedRepPolicy,
  type SpacedRepPolicyId,
} from './types';

/** All Learn packs, sorted by `meta.order`. Add new units here. */
export const LEARN_PACKS: ContentPack[] = [packU1Dice, packU2Urns, packU3Ev].sort(
  (a, b) => a.meta.order - b.meta.order,
);

const packMap = new Map<PackId, ContentPack>(
  LEARN_PACKS.map((p) => [p.meta.id, p]),
);

export function packById(id: string | undefined): ContentPack | undefined {
  if (!id) return undefined;
  return packMap.get(id);
}

/**
 * Review generator pool for a pack:
 * explicit `drill.reviewTopicTags` if set, else union of `newTopicTags` from
 * `links.prerequisites` (fallback: `links.before`).
 */
export function resolveReviewTopicTags(pack: ContentPack): GeneratorId[] {
  const explicit = pack.drill.reviewTopicTags;
  if (explicit && explicit.length > 0) return [...explicit];

  const sourceIds =
    pack.meta.links.prerequisites.length > 0
      ? pack.meta.links.prerequisites
      : pack.meta.links.before;

  const tags: GeneratorId[] = [];
  const seen = new Set<GeneratorId>();
  for (const id of sourceIds) {
    const prior = packMap.get(id);
    if (!prior) continue;
    for (const tag of prior.drill.newTopicTags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * New-topic share for a drill under the given policy.
 * `standard` keeps pack-authored `newShare` (current U1/U2/U3 mixes).
 * Other policies use `1 − SPACED_REP_POLICIES[policy].reviewShare`.
 */
export function resolveNewShare(
  pack: ContentPack,
  policy: SpacedRepPolicyId = RUNTIME_SPACED_REP_POLICY,
): number {
  if (policy === 'standard') {
    return Math.min(1, Math.max(0, pack.drill.newShare));
  }
  const reviewShare = SPACED_REP_POLICIES[policy].reviewShare;
  return Math.min(1, Math.max(0, 1 - reviewShare));
}

export { packU1Dice, packU2Urns, packU3Ev };
