import { LEARN_COLLECTIONS, LEARN_ROOT_COLLECTION_IDS } from '@/content/packs/collections';
import { LEARN_PACKS } from '@/content/packs/registry';
import { fingerprintUnits, normalizePack } from '@/content/packs/normalize';
import type { ContentPack } from '@/content/packs/types';

import {
  CONTENT_STORE_SCHEMA_VERSION,
  MATHA_FORMAT_VERSION,
  type ContentStoreSnapshot,
  type StoreCollection,
  type StoreUnit,
} from './types';

export const SHIPPED_PACKAGE_ID = 'matha.shipped.probability-foundations';

/**
 * Package revision for shipped curriculum.
 * Authority for content updates (≠ CONTENT_STORE_SCHEMA_VERSION).
 * Derived from max unit `meta.version` — bump a unit version when shipped
 * content changes so existing installs pick up the update.
 */
export function shippedPackageRevision(): number {
  return Math.max(1, ...LEARN_PACKS.map((p) => p.meta.version));
}

export function buildShippedUnits(): ContentPack[] {
  return LEARN_PACKS.map((raw) =>
    normalizePack({
      ...raw,
      meta: { ...raw.meta, packageId: SHIPPED_PACKAGE_ID },
    }),
  );
}

export function shippedContentFingerprint(): string {
  return fingerprintUnits(buildShippedUnits());
}

/** Build the initial content store from TS-authored shipped packs. */
export function buildShippedSnapshot(now = new Date().toISOString()): ContentStoreSnapshot {
  const units: ContentStoreSnapshot['units'] = {};
  for (const pack of buildShippedUnits()) {
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

  const revision = shippedPackageRevision();
  const fp = shippedContentFingerprint();

  return {
    schemaVersion: CONTENT_STORE_SCHEMA_VERSION,
    packages: {
      [SHIPPED_PACKAGE_ID]: {
        packageId: SHIPPED_PACKAGE_ID,
        revision,
        formatVersion: MATHA_FORMAT_VERSION,
        title: 'Probability foundations (shipped)',
        provenance: 'shipped',
        installedAt: now,
        updatedAt: now,
        roots: LEARN_ROOT_COLLECTION_IDS.map((id) => ({ kind: 'collection' as const, id })),
        contentFingerprint: fp,
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

/**
 * Apply shipped curriculum updates using the same revision rules as `.matha`:
 * - higher revision → replace content; preserve progress for unchanged ids
 * - same revision + same fingerprint → no-op
 * - same revision + different content → treat as authoring error; still apply
 *   for shipped (app binary is source of truth) but bump is required for imports
 * - lower revision (app downgrade) → keep installed content (no downgrade)
 *
 * Content revision ≠ storage migration (`CONTENT_STORE_SCHEMA_VERSION`).
 */
export function syncShippedPackage(
  snapshot: ContentStoreSnapshot,
  now = new Date().toISOString(),
): { snapshot: ContentStoreSnapshot; status: 'noop' | 'updated' | 'seeded' | 'kept-newer' } {
  const prior = snapshot.packages[SHIPPED_PACKAGE_ID];
  if (!prior) {
    // Merge shipped into an existing store that somehow lacks it
    const seeded = buildShippedSnapshot(now);
    return {
      status: 'seeded',
      snapshot: {
        ...snapshot,
        packages: { ...snapshot.packages, ...seeded.packages },
        collections: { ...snapshot.collections, ...seeded.collections },
        units: { ...snapshot.units, ...seeded.units },
        rootCollectionIds: mergeRoots(snapshot.rootCollectionIds, seeded.rootCollectionIds),
        placements: [
          ...snapshot.placements.filter((p) => p.packageId !== SHIPPED_PACKAGE_ID),
          ...seeded.placements,
        ],
      },
    };
  }

  const nextRevision = shippedPackageRevision();
  const nextFp = shippedContentFingerprint();

  if (nextRevision < prior.revision) {
    return { snapshot, status: 'kept-newer' };
  }

  if (
    nextRevision === prior.revision &&
    (prior.contentFingerprint ?? '') === nextFp
  ) {
    return { snapshot, status: 'noop' };
  }

  // Update (revision bump, or same-rev content fix for shipped binary)
  const next = structuredClone(snapshot);
  const incomingUnits = buildShippedUnits();
  const incomingUnitIds = new Set(incomingUnits.map((u) => u.meta.id));
  const incomingColIds = new Set(LEARN_COLLECTIONS.map((c) => c.id));

  for (const [id, unit] of Object.entries(next.units)) {
    if (unit.meta.packageId === SHIPPED_PACKAGE_ID && !incomingUnitIds.has(id)) {
      next.units[id] = { ...unit, active: false };
    }
  }
  for (const [id, col] of Object.entries(next.collections)) {
    if (col.packageId === SHIPPED_PACKAGE_ID && !incomingColIds.has(id)) {
      next.collections[id] = { ...col, active: false };
    }
  }

  for (const pack of incomingUnits) {
    next.units[pack.meta.id] = toStoreUnit(pack, SHIPPED_PACKAGE_ID);
  }
  for (const c of LEARN_COLLECTIONS) {
    next.collections[c.id] = {
      ...c,
      packageId: SHIPPED_PACKAGE_ID,
      active: true,
    };
  }

  next.packages[SHIPPED_PACKAGE_ID] = {
    ...prior,
    revision: nextRevision,
    updatedAt: now,
    contentFingerprint: nextFp,
    roots: LEARN_ROOT_COLLECTION_IDS.map((id) => ({ kind: 'collection' as const, id })),
  };

  for (const id of LEARN_ROOT_COLLECTION_IDS) {
    if (!next.rootCollectionIds.includes(id)) {
      next.rootCollectionIds = [...next.rootCollectionIds, id];
    }
  }

  return { snapshot: next, status: 'updated' };
}

function mergeRoots(existing: string[], shipped: string[]): string[] {
  const out = [...existing];
  for (const id of shipped) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
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
