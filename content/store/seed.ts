import { LEARN_COLLECTIONS, LEARN_ROOT_COLLECTION_IDS } from '@/content/packs/collections';
import { LEARN_PACKS } from '@/content/packs/registry';
import { normalizePack } from '@/content/packs/normalize';
import type { ContentPack } from '@/content/packs/types';

import {
  CONTENT_STORE_SCHEMA_VERSION,
  MATHA_FORMAT_VERSION,
  type ContentStoreSnapshot,
  type StoreCollection,
  type StoreUnit,
} from './types';

export const SHIPPED_PACKAGE_ID = 'matha.shipped.probability-foundations';

/** Build the initial content store from TS-authored shipped packs. */
export function buildShippedSnapshot(now = new Date().toISOString()): ContentStoreSnapshot {
  const units: ContentStoreSnapshot['units'] = {};
  for (const raw of LEARN_PACKS) {
    const pack = normalizePack(raw);
    units[pack.meta.id] = toStoreUnit(pack, SHIPPED_PACKAGE_ID);
  }

  const collections: ContentStoreSnapshot['collections'] = {};
  for (const c of LEARN_COLLECTIONS) {
    collections[c.id] = {
      ...c,
      packageId: SHIPPED_PACKAGE_ID,
      active: true,
    } satisfies StoreCollection;
  }

  return {
    schemaVersion: CONTENT_STORE_SCHEMA_VERSION,
    packages: {
      [SHIPPED_PACKAGE_ID]: {
        packageId: SHIPPED_PACKAGE_ID,
        revision: 1,
        formatVersion: MATHA_FORMAT_VERSION,
        title: 'Probability foundations (shipped)',
        provenance: 'shipped',
        installedAt: now,
        updatedAt: now,
        roots: LEARN_ROOT_COLLECTION_IDS.map((id) => ({ kind: 'collection' as const, id })),
      },
    },
    collections,
    units,
    rootCollectionIds: [...LEARN_ROOT_COLLECTION_IDS],
    placements: LEARN_ROOT_COLLECTION_IDS.map((id, index) => ({
      packageId: SHIPPED_PACKAGE_ID,
      rootId: id,
      rootKind: 'collection' as const,
      parentCollectionId: null,
      index,
    })),
  };
}

export function toStoreUnit(pack: ContentPack, packageId: string): StoreUnit {
  const normalized = normalizePack(pack);
  return {
    ...normalized,
    meta: {
      ...normalized.meta,
      packageId,
    },
    active: true,
  };
}
