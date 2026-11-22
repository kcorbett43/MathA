import type {
  ContentPack,
  GeneratorId,
  LearnModule,
  ModuleId,
  PackId,
  SpacedRepPolicyId,
} from './types';
import {
  RUNTIME_SPACED_REP_POLICY,
  SPACED_REP_POLICIES,
} from './types';

import { LEARN_MODULES } from './modules';
import { packU1Dice } from './u1-dice';
import { packU2Urns } from './u2-urns';
import { packU3Ev } from './u3-ev';

export {
  CONTENT_PACK_SCHEMA_VERSION,
  RUNTIME_SPACED_REP_POLICY,
  SPACED_REP_POLICIES,
  type ContentPack,
  type GeneratorId,
  type LearnModule,
  type ModuleId,
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

export { LEARN_MODULES } from './modules';

/** All Learn packs, sorted by module order then unit order. Add new units here. */
export const LEARN_PACKS: ContentPack[] = [packU1Dice, packU2Urns, packU3Ev];

const packMap = new Map<PackId, ContentPack>(
  LEARN_PACKS.map((p) => [p.meta.id, p]),
);

const moduleMap = new Map<ModuleId, LearnModule>(
  LEARN_MODULES.map((m) => [m.id, m]),
);

export function packById(id: string | undefined): ContentPack | undefined {
  if (!id) return undefined;
  return packMap.get(id);
}

export function moduleById(id: string | undefined): LearnModule | undefined {
  if (!id) return undefined;
  return moduleMap.get(id);
}

/** Units in a module, in `unitIds` order (falls back to pack.meta.order). */
export function packsForModule(moduleId: ModuleId | string | undefined): ContentPack[] {
  const mod = moduleById(moduleId);
  if (!mod) return [];
  const packs = mod.unitIds
    .map((id) => packMap.get(id))
    .filter((p): p is ContentPack => Boolean(p));
  if (packs.length > 0) return packs;
  return LEARN_PACKS.filter((p) => p.meta.moduleId === moduleId).sort(
    (a, b) => a.meta.order - b.meta.order,
  );
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
