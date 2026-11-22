import { fingerprintUnits, normalizePack } from '@/content/packs/normalize';
import type { CollectionId, ContentPack, PackId } from '@/content/packs/types';
import { persistPackageAssets } from '@/content/store/assets';
import { progressKey } from '@/content/store/ids';
import { toStoreUnit } from '@/content/store/seed';
import type {
  ContentStoreSnapshot,
  InstalledPackage,
  PlacementRecord,
  ProgressStoreSnapshot,
  StoreCollection,
} from '@/content/store/types';

import type { ImportPreview, PlacementChoice, ValidationIssue } from './types';
import { parseMathaZip } from './parse';
import { hasErrors, validateParsedPackage, type ValidatedMatha } from './validate';

export type PrepareResult = {
  validated: ValidatedMatha;
  preview: ImportPreview;
  priorFingerprint?: string;
};

function unitTitle(u: ContentPack): string {
  return u.meta.title;
}

function fingerprintFromStore(
  snapshot: ContentStoreSnapshot,
  packageId: string,
): string | undefined {
  const pkg = snapshot.packages[packageId];
  if (pkg?.contentFingerprint) return pkg.contentFingerprint;
  const units = Object.values(snapshot.units)
    .filter((u) => u.meta.packageId === packageId && u.active)
    .map((u) => normalizePack(u));
  if (units.length === 0) return undefined;
  return fingerprintUnits(units);
}

/**
 * Parse + validate bytes and build an import preview against the current store.
 *
 * Revision rules:
 * - same revision + same content → no-op (canInstall, contentUnchanged)
 * - same revision + different content → **reject**
 * - higher revision → update
 * - lower revision (downgrade) → **reject**
 * - returning a previously deleted id → reactivates; progress for that triple kept
 */
export function prepareImport(
  bytes: Uint8Array,
  snapshot: ContentStoreSnapshot,
): PrepareResult {
  const parsed = parseMathaZip(bytes);
  const validated = validateParsedPackage(parsed);
  const installedPkg = snapshot.packages[validated.manifest.packageId];
  const priorFingerprint = installedPkg
    ? fingerprintFromStore(snapshot, validated.manifest.packageId)
    : undefined;

  const issues: ValidationIssue[] = [...validated.issues];

  // Collision: different package already owns an id
  for (const unit of validated.units) {
    const existing = snapshot.units[unit.meta.id];
    if (
      existing &&
      existing.meta.packageId &&
      existing.meta.packageId !== validated.manifest.packageId
    ) {
      issues.push({
        level: 'error',
        code: 'id.collision',
        message: `Unit id ${unit.meta.id} already owned by package ${existing.meta.packageId} — ids must be namespaced; never silent overwrite`,
      });
    }
  }
  if (validated.tree) {
    for (const col of validated.tree.collections) {
      const existing = snapshot.collections[col.id];
      if (
        existing &&
        existing.packageId &&
        existing.packageId !== validated.manifest.packageId
      ) {
        issues.push({
          level: 'error',
          code: 'id.collision',
          message: `Collection id ${col.id} already owned by package ${existing.packageId}`,
        });
      }
    }
  }

  const sameRevision = Boolean(
    installedPkg && installedPkg.revision === validated.manifest.revision,
  );
  const isDowngrade = Boolean(
    installedPkg && validated.manifest.revision < installedPkg.revision,
  );
  const contentUnchanged = Boolean(
    priorFingerprint && priorFingerprint === validated.contentFingerprint,
  );

  if (isDowngrade) {
    issues.push({
      level: 'error',
      code: 'revision.downgrade',
      message: `Downgrade blocked: package revision ${validated.manifest.revision} < installed ${installedPkg!.revision}`,
    });
  }

  if (sameRevision && !contentUnchanged) {
    issues.push({
      level: 'error',
      code: 'revision.contentChanged',
      message:
        'Same revision but content differs — bump package revision before reimport',
    });
  }

  const roots: ImportPreview['roots'] = [];
  if (validated.tree) {
    const rootIds = validated.tree.roots ?? [validated.tree.collections[0]?.id].filter(Boolean);
    for (const id of rootIds as string[]) {
      const col = validated.tree.collections.find((c) => c.id === id);
      roots.push({
        kind: 'collection',
        id,
        title: col?.title ?? id,
      });
    }
  } else if (validated.units[0]) {
    roots.push({
      kind: 'unit',
      id: validated.units[0].meta.id,
      title: unitTitle(validated.units[0]),
    });
  }

  const preview: ImportPreview = {
    packageId: validated.manifest.packageId,
    revision: validated.manifest.revision,
    title: validated.manifest.title,
    attribution: validated.manifest.attribution,
    formatVersion: validated.manifest.formatVersion,
    scope: validated.manifest.scope,
    roots,
    unitSummaries: validated.units.map((u) => ({
      id: u.meta.id,
      title: u.meta.title,
      hasLesson: Boolean(u.lesson),
      hasPractice: Boolean(u.practice),
      hasReview: Boolean(u.review?.sources?.length),
      generators: (u.practice?.generators ?? []) as ImportPreview['unitSummaries'][0]['generators'],
    })),
    issues,
    installed: installedPkg
      ? {
          revision: installedPkg.revision,
          sameRevision,
          contentUnchanged: sameRevision && contentUnchanged,
        }
      : undefined,
    canInstall: !hasErrors(issues),
  };

  return { validated, preview, priorFingerprint };
}

export type InstallResult =
  | { status: 'noop'; snapshot: ContentStoreSnapshot }
  | { status: 'installed'; snapshot: ContentStoreSnapshot; preservedProgressIds: string[] }
  | { status: 'blocked'; preview: ImportPreview };

/**
 * Atomically apply a validated package into a cloned snapshot.
 * Returning a previously inactive unit/collection id sets `active: true`
 * and retains progress rows for unchanged (packageId, unitId, itemId) triples.
 */
export async function installPackage(
  snapshot: ContentStoreSnapshot,
  validated: ValidatedMatha,
  preview: ImportPreview,
  placement: PlacementChoice | null,
  progress?: ProgressStoreSnapshot,
): Promise<InstallResult> {
  if (!preview.canInstall) {
    return { status: 'blocked', preview };
  }

  if (preview.installed?.sameRevision && preview.installed.contentUnchanged) {
    return { status: 'noop', snapshot };
  }

  const next: ContentStoreSnapshot = structuredClone(snapshot);
  const now = new Date().toISOString();
  const packageId = validated.manifest.packageId;
  const prior = next.packages[packageId];
  const assetUris = await persistPackageAssets(packageId, validated.assets);

  const incomingUnitIds = new Set(validated.units.map((u) => u.meta.id));
  const incomingColIds = new Set(validated.tree?.collections.map((c) => c.id) ?? []);

  for (const [id, unit] of Object.entries(next.units)) {
    if (unit.meta.packageId === packageId && !incomingUnitIds.has(id)) {
      next.units[id] = { ...unit, active: false };
    }
  }
  for (const [id, col] of Object.entries(next.collections)) {
    if (col.packageId === packageId && !incomingColIds.has(id)) {
      next.collections[id] = { ...col, active: false };
    }
  }

  // Upsert / reactivate units
  for (const unit of validated.units) {
    const normalized = normalizePack({
      ...unit,
      meta: { ...unit.meta, packageId },
    });
    next.units[unit.meta.id] = toStoreUnit(normalized, packageId);
  }

  if (validated.tree) {
    for (const col of validated.tree.collections) {
      const children = col.children.map((ch) => {
        if (ch.kind === 'collection') return { kind: 'collection' as const, id: ch.id };
        return { kind: 'pack' as const, id: ch.id };
      });
      const storeCol: StoreCollection = {
        id: col.id,
        title: col.title,
        blurb: col.blurb,
        children,
        packageId,
        active: true,
      };
      next.collections[col.id] = storeCol;
    }
  }

  const roots: InstalledPackage['roots'] = preview.roots.map((r) => ({
    kind: r.kind,
    id: r.id,
  }));

  next.packages[packageId] = {
    packageId,
    revision: validated.manifest.revision,
    formatVersion: validated.manifest.formatVersion,
    title: validated.manifest.title,
    attribution: validated.manifest.attribution,
    provenance: prior?.provenance === 'shipped' ? 'shipped' : 'imported',
    installedAt: prior?.installedAt ?? now,
    updatedAt: now,
    roots,
    contentFingerprint: validated.contentFingerprint,
    assetUris: Object.keys(assetUris).length > 0 ? assetUris : prior?.assetUris,
  };

  if (!prior) {
    applyPlacement(next, packageId, preview, placement);
  } else {
    preserveOrUpdatePlacement(next, packageId, preview, prior);
  }

  const preservedProgressIds: string[] = [];
  if (progress) {
    for (const row of progress.cards) {
      if (row.packageId === packageId && incomingUnitIds.has(row.unitId)) {
        preservedProgressIds.push(progressKey(row.packageId, row.unitId, row.cardId));
      }
    }
    for (const row of progress.questions) {
      if (row.packageId === packageId && incomingUnitIds.has(row.unitId)) {
        preservedProgressIds.push(progressKey(row.packageId, row.unitId, row.questionId));
      }
    }
  }

  return { status: 'installed', snapshot: next, preservedProgressIds };
}

function applyPlacement(
  snapshot: ContentStoreSnapshot,
  packageId: string,
  preview: ImportPreview,
  placement: PlacementChoice | null,
): void {
  const parentId = placement?.parentCollectionId ?? null;
  const index = placement?.index ?? 0;

  snapshot.placements = snapshot.placements.filter((p) => p.packageId !== packageId);

  for (let i = 0; i < preview.roots.length; i++) {
    const root = preview.roots[i]!;
    const record: PlacementRecord = {
      packageId,
      rootId: root.id,
      rootKind: root.kind,
      parentCollectionId: parentId,
      index: index + i,
    };
    snapshot.placements.push(record);

    if (root.kind === 'collection') {
      if (parentId == null) {
        insertRoot(snapshot, root.id, index + i);
      } else {
        insertChild(snapshot, parentId, { kind: 'collection', id: root.id }, index + i);
      }
    } else {
      const shelfId = ensureImportShelf(snapshot, parentId);
      insertChild(snapshot, shelfId, { kind: 'pack', id: root.id }, index + i);
      if (parentId == null && !snapshot.rootCollectionIds.includes(shelfId)) {
        insertRoot(snapshot, shelfId, index + i);
      }
      record.parentCollectionId = shelfId;
    }
  }
}

function preserveOrUpdatePlacement(
  snapshot: ContentStoreSnapshot,
  packageId: string,
  preview: ImportPreview,
  _prior: InstalledPackage,
): void {
  const existing = snapshot.placements.filter((p) => p.packageId === packageId);
  if (existing.length === 0) {
    applyPlacement(snapshot, packageId, preview, { parentCollectionId: null });
    return;
  }
  for (const place of existing) {
    if (place.rootKind === 'collection') {
      if (place.parentCollectionId == null) {
        if (!snapshot.rootCollectionIds.includes(place.rootId)) {
          insertRoot(snapshot, place.rootId, place.index);
        }
      } else {
        ensureChild(
          snapshot,
          place.parentCollectionId,
          { kind: 'collection', id: place.rootId },
          place.index,
        );
      }
    } else if (place.parentCollectionId) {
      ensureChild(
        snapshot,
        place.parentCollectionId,
        { kind: 'pack', id: place.rootId },
        place.index,
      );
    }
  }
  const rootIds = new Set(preview.roots.map((r) => r.id));
  snapshot.placements = snapshot.placements.filter(
    (p) => p.packageId !== packageId || rootIds.has(p.rootId),
  );
}

function insertRoot(snapshot: ContentStoreSnapshot, id: CollectionId, index: number): void {
  const ids = snapshot.rootCollectionIds.filter((x) => x !== id);
  const i = Math.max(0, Math.min(index, ids.length));
  ids.splice(i, 0, id);
  snapshot.rootCollectionIds = ids;
}

function insertChild(
  snapshot: ContentStoreSnapshot,
  parentId: CollectionId,
  child: { kind: 'collection' | 'pack'; id: string },
  index: number,
): void {
  const parent = snapshot.collections[parentId];
  if (!parent) return;
  const children = parent.children.filter(
    (c) => !(c.kind === child.kind && c.id === child.id),
  );
  const i = Math.max(0, Math.min(index, children.length));
  children.splice(i, 0, child);
  snapshot.collections[parentId] = { ...parent, children };
}

function ensureChild(
  snapshot: ContentStoreSnapshot,
  parentId: CollectionId,
  child: { kind: 'collection' | 'pack'; id: string },
  index: number,
): void {
  const parent = snapshot.collections[parentId];
  if (!parent) return;
  if (parent.children.some((c) => c.kind === child.kind && c.id === child.id)) return;
  insertChild(snapshot, parentId, child, index);
}

const IMPORT_SHELF_ID = 'c-imported';

function ensureImportShelf(
  snapshot: ContentStoreSnapshot,
  preferredParent: CollectionId | null,
): CollectionId {
  if (preferredParent && snapshot.collections[preferredParent]) return preferredParent;
  if (!snapshot.collections[IMPORT_SHELF_ID]) {
    snapshot.collections[IMPORT_SHELF_ID] = {
      id: IMPORT_SHELF_ID,
      title: 'Imported',
      blurb: 'Packages you imported',
      children: [],
      active: true,
    };
  }
  return IMPORT_SHELF_ID;
}

export async function importMathaBytes(
  bytes: Uint8Array,
  snapshot: ContentStoreSnapshot,
  placement: PlacementChoice | null,
  progress?: ProgressStoreSnapshot,
): Promise<InstallResult & { preview: ImportPreview }> {
  const { validated, preview } = prepareImport(bytes, snapshot);
  if (preview.installed?.sameRevision && preview.installed.contentUnchanged) {
    return { status: 'noop', snapshot, preview };
  }
  const result = await installPackage(snapshot, validated, preview, placement, progress);
  if (result.status === 'blocked') return { ...result, preview: result.preview };
  return { ...result, preview };
}

export type { PackId };
