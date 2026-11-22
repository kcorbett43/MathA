import {
  emptyProgress,
  loadContentSnapshot,
  loadProgressSnapshot,
  saveContentSnapshot,
  saveProgressSnapshot,
} from './persistence';
import { buildShippedSnapshot } from './seed';
import {
  getRuntimeProgress,
  getRuntimeSnapshot,
  setRuntimeProgress,
  setRuntimeSnapshot,
} from './runtime';
import type { ContentStoreSnapshot, ProgressStoreSnapshot } from './types';
import * as query from './query';

export {
  CONTENT_STORE_SCHEMA_VERSION,
  MATHA_FORMAT_VERSION,
  type ContentStoreSnapshot,
  type InstalledPackage,
  type PlacementRecord,
  type ProgressStoreSnapshot,
  type StoreCollection,
  type StoreUnit,
} from './types';

export { buildShippedSnapshot, SHIPPED_PACKAGE_ID } from './seed';
export {
  getRuntimeSnapshot,
  setRuntimeSnapshot,
  getRuntimeProgress,
  setRuntimeProgress,
  isContentStoreReady,
} from './runtime';
export { query };

/**
 * Load content + progress from AsyncStorage, seeding shipped packs on first run.
 * Updates the in-memory runtime snapshot used by sync pack helpers.
 */
export async function bootstrapContentStore(): Promise<{
  content: ContentStoreSnapshot;
  progress: ProgressStoreSnapshot;
}> {
  let content = await loadContentSnapshot();
  if (!content || content.schemaVersion !== 1) {
    content = buildShippedSnapshot();
    await saveContentSnapshot(content);
  }
  let progress = await loadProgressSnapshot();
  if (!progress) {
    progress = emptyProgress();
    await saveProgressSnapshot(progress);
  }
  setRuntimeSnapshot(content);
  setRuntimeProgress(progress);
  return { content, progress };
}

/** Persist a new content snapshot (atomic replace) and update runtime. */
export async function commitContentSnapshot(snapshot: ContentStoreSnapshot): Promise<void> {
  await saveContentSnapshot(snapshot);
  setRuntimeSnapshot(snapshot);
}

export async function commitProgressSnapshot(progress: ProgressStoreSnapshot): Promise<void> {
  await saveProgressSnapshot(progress);
  setRuntimeProgress(progress);
}

export function packById(id: string | undefined) {
  return query.activeUnit(getRuntimeSnapshot(), id);
}

export function collectionById(id: string | undefined) {
  return query.activeCollection(getRuntimeSnapshot(), id);
}

export function rootCollections() {
  return query.rootCollections(getRuntimeSnapshot());
}

export function resolveCollectionChildren(collection: Parameters<typeof query.resolveCollectionChildren>[1]) {
  return query.resolveCollectionChildren(getRuntimeSnapshot(), collection);
}

export function countLeafPacks(collection: Parameters<typeof query.countLeafPacks>[1]) {
  return query.countLeafPacks(getRuntimeSnapshot(), collection);
}

export function collectionPath(collectionId: string | undefined) {
  return query.collectionPath(getRuntimeSnapshot(), collectionId);
}

export function parentCollectionId(collectionId: string | undefined) {
  return query.parentCollectionId(getRuntimeSnapshot(), collectionId);
}

export function cardsInPack(pack: Parameters<typeof query.cardsInUnit>[1] | { meta: { id: string } }) {
  const id = typeof pack === 'string' || pack === undefined ? pack : pack.meta.id;
  return query.cardsInUnit(getRuntimeSnapshot(), id);
}
