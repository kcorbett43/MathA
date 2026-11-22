import type {
  CollectionId,
  ContentPack,
  GeneratorId,
  LearnCollection,
  PackCard,
  PackId,
  SpacedRepPolicyId,
} from './types';
import {
  RUNTIME_SPACED_REP_POLICY,
  SPACED_REP_POLICIES,
} from './types';
import { expandReviewCards, getPractice, normalizePack } from './normalize';
import { LEARN_PACKS } from './registry';
import {
  collectionById as storeCollectionById,
  collectionPath as storeCollectionPath,
  countLeafPacks as storeCountLeafPacks,
  getRuntimeSnapshot,
  packById as storePackById,
  parentCollectionId as storeParentCollectionId,
  resolveCollectionChildren as storeResolveCollectionChildren,
  rootCollections as storeRootCollections,
} from '@/content/store';

export {
  CONTENT_PACK_SCHEMA_VERSION,
  RUNTIME_SPACED_REP_POLICY,
  SPACED_REP_POLICIES,
  KNOWN_GENERATOR_IDS,
  isKnownGeneratorId,
  type AnswerType,
  type Attribution,
  type AuthoredQuestion,
  type ChoiceOption,
  type CollectionChild,
  type CollectionId,
  type ContentPack,
  type GeneratorId,
  type LearnCollection,
  type PackCard,
  type PackDefinition,
  type PackDrill,
  type PackExample,
  type PackId,
  type PackLinks,
  type PackLesson,
  type PackMeta,
  type PackPractice,
  type PackReview,
  type ReviewCardRef,
  type ReviewSource,
  type ReviewSourceKind,
  type SpacedRepPolicy,
  type SpacedRepPolicyId,
} from './types';

export { LEARN_COLLECTIONS, LEARN_ROOT_COLLECTION_IDS } from './collections';
export { LEARN_PACKS, packU1Dice, packU2Urns, packU3Ev } from './registry';
export {
  expandReviewCards,
  getLesson,
  getPractice,
  getReview,
  normalizePack,
  unitHasActivity,
} from './normalize';

/** Prefer content-store lookup; falls back to shipped TS registry before bootstrap. */
export function packById(id: string | undefined): ContentPack | undefined {
  const fromStore = storePackById(id);
  if (fromStore) return fromStore;
  if (!id) return undefined;
  return LEARN_PACKS.find((p) => p.meta.id === id);
}

export function collectionById(id: string | undefined): LearnCollection | undefined {
  return storeCollectionById(id);
}

export function rootCollections(): LearnCollection[] {
  return storeRootCollections();
}

export type ResolvedCollectionChild =
  | { kind: 'collection'; collection: LearnCollection }
  | { kind: 'pack'; pack: ContentPack };

export function resolveCollectionChildren(
  collection: LearnCollection,
): ResolvedCollectionChild[] {
  return storeResolveCollectionChildren(collection);
}

export function countLeafPacks(collection: LearnCollection): number {
  return storeCountLeafPacks(collection);
}

export function collectionPath(collectionId: CollectionId | string | undefined): LearnCollection[] {
  return storeCollectionPath(collectionId);
}

export function parentCollectionId(
  collectionId: CollectionId | string | undefined,
): CollectionId | undefined {
  return storeParentCollectionId(collectionId);
}

/** Expanded review cards for flip study (basic / reversible / cloze). */
export function cardsInPack(pack: ContentPack): PackCard[] {
  return expandReviewCards(pack).map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    tags: c.tags,
  }));
}

/**
 * Review generator pool for a pack:
 * explicit practice.reviewGenerators if set, else union of generators from
 * `links.prerequisites` (fallback: `links.before`).
 */
export function resolveReviewTopicTags(pack: ContentPack): GeneratorId[] {
  const practice = getPractice(pack);
  const explicit = practice?.reviewGenerators;
  if (explicit && explicit.length > 0) return [...explicit];

  const sourceIds =
    pack.meta.links.prerequisites.length > 0
      ? pack.meta.links.prerequisites
      : pack.meta.links.before;

  const snapshot = getRuntimeSnapshot();
  const tags: GeneratorId[] = [];
  const seen = new Set<GeneratorId>();
  for (const id of sourceIds) {
    const prior = snapshot.units[id] ?? LEARN_PACKS.find((p) => p.meta.id === id);
    if (!prior) continue;
    const gens = getPractice(normalizePack(prior))?.generators ?? [];
    for (const tag of gens) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * New-topic share for generated slots under the given policy.
 * `standard` keeps pack-authored `generatorNewShare` (current U1/U2/U3 mixes).
 */
export function resolveNewShare(
  pack: ContentPack,
  policy: SpacedRepPolicyId = RUNTIME_SPACED_REP_POLICY,
): number {
  const practice = getPractice(pack);
  if (policy === 'standard') {
    const share = practice?.generatorNewShare ?? 1;
    return Math.min(1, Math.max(0, share));
  }
  const reviewShare = SPACED_REP_POLICIES[policy].reviewShare;
  return Math.min(1, Math.max(0, 1 - reviewShare));
}

export type { PackId as UnitId };
