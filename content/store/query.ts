import {
  expandReviewCards,
  getLesson,
  getPractice,
  getReview,
  type ExpandedReviewCard,
} from '@/content/packs/normalize';
import type {
  CollectionId,
  ContentPack,
  LearnCollection,
  PackId,
} from '@/content/packs/types';

import type { ContentStoreSnapshot, StoreCollection, StoreUnit } from './types';

export type ResolvedCollectionChild =
  | { kind: 'collection'; collection: LearnCollection }
  | { kind: 'pack'; pack: ContentPack };

export function activeUnit(
  snapshot: ContentStoreSnapshot,
  id: string | undefined,
): StoreUnit | undefined {
  if (!id) return undefined;
  const unit = snapshot.units[id];
  if (!unit || !unit.active) return undefined;
  return unit;
}

export function activeCollection(
  snapshot: ContentStoreSnapshot,
  id: string | undefined,
): StoreCollection | undefined {
  if (!id) return undefined;
  const col = snapshot.collections[id];
  if (!col || !col.active) return undefined;
  return col;
}

export function rootCollections(snapshot: ContentStoreSnapshot): StoreCollection[] {
  return snapshot.rootCollectionIds
    .map((id) => activeCollection(snapshot, id))
    .filter((c): c is StoreCollection => Boolean(c));
}

export function resolveCollectionChildren(
  snapshot: ContentStoreSnapshot,
  collection: LearnCollection,
): ResolvedCollectionChild[] {
  const out: ResolvedCollectionChild[] = [];
  for (const child of collection.children) {
    if (child.kind === 'collection') {
      const nested = activeCollection(snapshot, child.id);
      if (nested) out.push({ kind: 'collection', collection: nested });
    } else {
      const pack = activeUnit(snapshot, child.id);
      if (pack) out.push({ kind: 'pack', pack });
    }
  }
  return out;
}

export function countLeafPacks(
  snapshot: ContentStoreSnapshot,
  collection: LearnCollection,
): number {
  let n = 0;
  for (const child of collection.children) {
    if (child.kind === 'pack') {
      if (activeUnit(snapshot, child.id)) n += 1;
    } else {
      const nested = activeCollection(snapshot, child.id);
      if (nested) n += countLeafPacks(snapshot, nested);
    }
  }
  return n;
}

export function collectionPath(
  snapshot: ContentStoreSnapshot,
  collectionId: CollectionId | string | undefined,
): StoreCollection[] {
  if (!collectionId) return [];
  for (const rootId of snapshot.rootCollectionIds) {
    const path = walkPath(snapshot, rootId, collectionId, []);
    if (path) return path;
  }
  const alone = activeCollection(snapshot, collectionId);
  return alone ? [alone] : [];
}

function walkPath(
  snapshot: ContentStoreSnapshot,
  currentId: CollectionId,
  targetId: CollectionId | string,
  ancestors: StoreCollection[],
): StoreCollection[] | null {
  const current = activeCollection(snapshot, currentId);
  if (!current) return null;
  const next = [...ancestors, current];
  if (current.id === targetId) return next;
  for (const child of current.children) {
    if (child.kind !== 'collection') continue;
    const found = walkPath(snapshot, child.id, targetId, next);
    if (found) return found;
  }
  return null;
}

export function parentCollectionId(
  snapshot: ContentStoreSnapshot,
  collectionId: CollectionId | string | undefined,
): CollectionId | undefined {
  const path = collectionPath(snapshot, collectionId);
  if (path.length < 2) return undefined;
  return path[path.length - 2]?.id;
}

export function cardsInUnit(
  snapshot: ContentStoreSnapshot,
  packId: PackId | string | undefined,
): ExpandedReviewCard[] {
  const unit = activeUnit(snapshot, packId);
  if (!unit) return [];
  return expandReviewCards(unit);
}

export function unitActivities(pack: ContentPack) {
  return {
    lesson: getLesson(pack),
    practice: getPractice(pack),
    review: getReview(pack),
  };
}
