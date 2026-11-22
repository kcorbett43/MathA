import {
  emptyProgress,
  loadContentSnapshot,
  loadProgressSnapshot,
  saveContentSnapshot,
  saveProgressSnapshot,
} from './persistence';
import { CONTENT_STORE_SCHEMA_VERSION } from './types';
import { buildShippedSnapshot, syncShippedPackage } from './seed';
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

export {
  buildShippedSnapshot,
  SHIPPED_PACKAGE_ID,
  shippedPackageRevision,
  syncShippedPackage,
} from './seed';
export {
  getRuntimeSnapshot,
  setRuntimeSnapshot,
  getRuntimeProgress,
  setRuntimeProgress,
  isContentStoreReady,
} from './runtime';
export { progressKey, parseProgressKey } from './ids';
export { query };

/**
 * Load content + progress from AsyncStorage.
 * Fresh install seeds shipped packs. Existing installs run **revision-aware**
 * shipped sync (same rules as `.matha` reimport) — content revision ≠
 * `CONTENT_STORE_SCHEMA_VERSION` storage migrations.
 */
export async function bootstrapContentStore(): Promise<{
  content: ContentStoreSnapshot;
  progress: ProgressStoreSnapshot;
}> {
  let content = await loadContentSnapshot();
  if (!content || content.schemaVersion !== CONTENT_STORE_SCHEMA_VERSION) {
    content = buildShippedSnapshot();
    await saveContentSnapshot(content);
  } else {
    const synced = syncShippedPackage(content);
    if (synced.status === 'updated' || synced.status === 'seeded') {
      content = synced.snapshot;
      await saveContentSnapshot(content);
    } else {
      content = synced.snapshot;
    }
  }

  let progress = await loadProgressSnapshot();
  if (!progress) {
    progress = emptyProgress();
    await saveProgressSnapshot(progress);
  } else {
    // Migrate legacy progress rows missing packageId (pre-triple keys)
    progress = migrateProgress(progress, content);
  }
  setRuntimeSnapshot(content);
  setRuntimeProgress(progress);
  return { content, progress };
}

function migrateProgress(
  progress: ProgressStoreSnapshot,
  content: ContentStoreSnapshot,
): ProgressStoreSnapshot {
  let changed = false;
  const cards = progress.cards.map((row) => {
    const legacy = row as ProgressStoreSnapshot['cards'][number] & { packageId?: string };
    if (legacy.packageId) return row;
    changed = true;
    const unit = content.units[row.unitId];
    return {
      ...row,
      packageId: unit?.meta.packageId ?? 'unknown',
    };
  });
  const questions = progress.questions.map((row) => {
    const legacy = row as ProgressStoreSnapshot['questions'][number] & { packageId?: string };
    if (legacy.packageId) return row;
    changed = true;
    const unit = content.units[row.unitId];
    return {
      ...row,
      packageId: unit?.meta.packageId ?? 'unknown',
    };
  });
  if (changed) void saveProgressSnapshot({ ...progress, cards, questions });
  return changed ? { ...progress, cards, questions } : progress;
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
