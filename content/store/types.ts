import type {
  Attribution,
  CollectionId,
  ContentPack,
  LearnCollection,
  PackId,
} from '@/content/packs/types';

/** `.matha` interchange format version supported by this app build. */
export const MATHA_FORMAT_VERSION = 1 as const;

/**
 * Content store *persistence* schema (AsyncStorage blob shape).
 * Bump only for storage migrations — **not** when curriculum content changes.
 * Content updates use package `revision` (see shipped sync / `.matha` reimport).
 */
export const CONTENT_STORE_SCHEMA_VERSION = 1 as const;

export type PackageId = string;

export type ContentProvenance = 'shipped' | 'imported';

export type InstalledPackage = {
  packageId: PackageId;
  /** Package content revision — authority for updates (≠ store schemaVersion). */
  revision: number;
  formatVersion: number;
  title?: string;
  attribution?: Attribution;
  provenance: ContentProvenance;
  installedAt: string;
  updatedAt: string;
  /** Root entries from the package (collections and/or bare units). */
  roots: Array<{ kind: 'collection' | 'unit'; id: string }>;
  /** Fingerprint of installed content for same-revision no-op checks. */
  contentFingerprint?: string;
  /**
   * Package-root-relative asset path → local file URI or data URI.
   * Used to render Markdown images / audio from imported packages.
   */
  assetUris?: Record<string, string>;
};

export type StoreCollection = LearnCollection & {
  packageId?: PackageId;
  /** Soft-deleted when removed from a reimported package; reappears → active again. */
  active: boolean;
};

export type StoreUnit = ContentPack & {
  /** Soft-deleted when removed; same id returning in a later revision reactivates. */
  active: boolean;
};

/**
 * Where an imported package root was placed in the learner tree.
 * Preserved on reimport unless the package relocates included nodes.
 */
export type PlacementRecord = {
  packageId: PackageId;
  /** Id of the placed root (collection or unit). */
  rootId: string;
  rootKind: 'collection' | 'unit';
  /** Parent collection id, or null when placed as a Learn home root. */
  parentCollectionId: CollectionId | null;
  /** Index hint within parent children / root list. */
  index: number;
};

export type ContentStoreSnapshot = {
  schemaVersion: typeof CONTENT_STORE_SCHEMA_VERSION;
  packages: Record<PackageId, InstalledPackage>;
  collections: Record<CollectionId, StoreCollection>;
  units: Record<PackId, StoreUnit>;
  /** Top-level collection ids shown on Learn home (active only). */
  rootCollectionIds: CollectionId[];
  placements: PlacementRecord[];
};

/**
 * Progress row — keyed by full triple (packageId, unitId, cardId).
 * See `content/store/ids.ts`.
 */
export type ProgressCardRow = {
  packageId: PackageId;
  unitId: PackId;
  cardId: string;
  /** Opaque learner progress payload — preserved across content updates. */
  data: Record<string, unknown>;
  updatedAt: string;
};

export type ProgressQuestionRow = {
  packageId: PackageId;
  unitId: PackId;
  questionId: string;
  data: Record<string, unknown>;
  updatedAt: string;
};

/** Progress is stored separately from content (never required in share packages). */
export type ProgressStoreSnapshot = {
  schemaVersion: 1;
  cards: ProgressCardRow[];
  questions: ProgressQuestionRow[];
};
