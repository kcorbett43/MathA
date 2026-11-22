import type { Attribution, GeneratorId } from '@/content/packs/types';
import { MATHA_FORMAT_VERSION } from '@/content/store/types';

export { MATHA_FORMAT_VERSION };

export type MathaManifest = {
  packageId: string;
  revision: number;
  formatVersion: number;
  title?: string;
  /** `collection` when tree.json present; `unit` for a bare single unit. */
  scope: 'collection' | 'unit' | 'collections';
  attribution?: Attribution;
};

export type MathaTreeCollection = {
  id: string;
  title: string;
  blurb?: string;
  children: Array<
    | { kind: 'collection'; id: string }
    | { kind: 'unit'; id: string }
    | { kind: 'pack'; id: string }
  >;
};

export type MathaTree = {
  collections: MathaTreeCollection[];
  /** Root collection ids (order authoritative). Omit for bare unit packages. */
  roots?: string[];
};

export type MathaAssetMap = Record<string, Uint8Array>;

export type ParsedMathaPackage = {
  manifest: MathaManifest;
  tree: MathaTree | null;
  /** unitId → raw unit.json object */
  units: Record<string, unknown>;
  /** package-root-relative path → bytes */
  assets: MathaAssetMap;
};

export type ValidationIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
};

export type ImportPreview = {
  packageId: string;
  revision: number;
  title?: string;
  attribution?: Attribution;
  formatVersion: number;
  scope: MathaManifest['scope'];
  roots: Array<{ kind: 'collection' | 'unit'; id: string; title: string }>;
  unitSummaries: Array<{
    id: string;
    title: string;
    hasLesson: boolean;
    hasPractice: boolean;
    hasReview: boolean;
    generators: GeneratorId[];
  }>;
  issues: ValidationIssue[];
  /** Comparison to already-installed package, if any. */
  installed?: {
    revision: number;
    sameRevision: boolean;
    contentUnchanged: boolean;
  };
  /** True when install is allowed (no errors). */
  canInstall: boolean;
};

export type PlacementChoice = {
  /** Parent collection id, or null for Learn home root. */
  parentCollectionId: string | null;
  index?: number;
};
