import type {
  CollectionId,
  ContentPack,
  GeneratorId,
  LearnCollection,
  PackId,
  SpacedRepPolicyId,
} from './types';
import {
  RUNTIME_SPACED_REP_POLICY,
  SPACED_REP_POLICIES,
} from './types';

import { LEARN_COLLECTIONS, LEARN_ROOT_COLLECTION_IDS } from './collections';
import { packU1Dice } from './u1-dice';
import { packU2Urns } from './u2-urns';
import { packU3Ev } from './u3-ev';

export {
  CONTENT_PACK_SCHEMA_VERSION,
  RUNTIME_SPACED_REP_POLICY,
  SPACED_REP_POLICIES,
  type CollectionChild,
  type CollectionId,
  type ContentPack,
  type GeneratorId,
  type LearnCollection,
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

export { LEARN_COLLECTIONS, LEARN_ROOT_COLLECTION_IDS } from './collections';

/** All Learn packs. Add new units here and place them in a collection’s children. */
export const LEARN_PACKS: ContentPack[] = [packU1Dice, packU2Urns, packU3Ev];

const packMap = new Map<PackId, ContentPack>(
  LEARN_PACKS.map((p) => [p.meta.id, p]),
);

const collectionMap = new Map<CollectionId, LearnCollection>(
  LEARN_COLLECTIONS.map((c) => [c.id, c]),
);

export function packById(id: string | undefined): ContentPack | undefined {
  if (!id) return undefined;
  return packMap.get(id);
}

export function collectionById(id: string | undefined): LearnCollection | undefined {
  if (!id) return undefined;
  return collectionMap.get(id);
}

export function rootCollections(): LearnCollection[] {
  return LEARN_ROOT_COLLECTION_IDS.map((id) => collectionMap.get(id)).filter(
    (c): c is LearnCollection => Boolean(c),
  );
}

export type ResolvedCollectionChild =
  | { kind: 'collection'; collection: LearnCollection }
  | { kind: 'pack'; pack: ContentPack };

/** Resolve a collection’s children to live collection/pack objects (skip missing). */
export function resolveCollectionChildren(
  collection: LearnCollection,
): ResolvedCollectionChild[] {
  const out: ResolvedCollectionChild[] = [];
  for (const child of collection.children) {
    if (child.kind === 'collection') {
      const nested = collectionMap.get(child.id);
      if (nested) out.push({ kind: 'collection', collection: nested });
    } else {
      const pack = packMap.get(child.id);
      if (pack) out.push({ kind: 'pack', pack });
    }
  }
  return out;
}

/** Count leaf packs under a collection (recursive). */
export function countLeafPacks(collection: LearnCollection): number {
  let n = 0;
  for (const child of collection.children) {
    if (child.kind === 'pack') {
      if (packMap.has(child.id)) n += 1;
    } else {
      const nested = collectionMap.get(child.id);
      if (nested) n += countLeafPacks(nested);
    }
  }
  return n;
}

/**
 * Path of collections from a root to `collectionId` (inclusive).
 * Used for breadcrumbs. Returns [] if not found under any root.
 */
export function collectionPath(collectionId: CollectionId | string | undefined): LearnCollection[] {
  if (!collectionId) return [];
  for (const rootId of LEARN_ROOT_COLLECTION_IDS) {
    const path = walkPath(rootId, collectionId, []);
    if (path) return path;
  }
  // Fallback: collection exists but not under a registered root
  const alone = collectionMap.get(collectionId);
  return alone ? [alone] : [];
}

function walkPath(
  currentId: CollectionId,
  targetId: CollectionId | string,
  ancestors: LearnCollection[],
): LearnCollection[] | null {
  const current = collectionMap.get(currentId);
  if (!current) return null;
  const next = [...ancestors, current];
  if (current.id === targetId) return next;
  for (const child of current.children) {
    if (child.kind !== 'collection') continue;
    const found = walkPath(child.id, targetId, next);
    if (found) return found;
  }
  return null;
}

/** Parent collection id for breadcrumb “up”, if any. */
export function parentCollectionId(
  collectionId: CollectionId | string | undefined,
): CollectionId | undefined {
  const path = collectionPath(collectionId);
  if (path.length < 2) return undefined;
  return path[path.length - 2]?.id;
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
