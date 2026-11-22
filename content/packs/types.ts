import type { QuantSkillId } from '@/lib/quantTypes';

/**
 * Bump when the pack JSON/TS shape breaks consumers.
 * v2: pack graph links + named spaced-repetition policies.
 * v3: nested Learn **collections** tree (unlimited depth) + breadcrumb nav.
 */
export const CONTENT_PACK_SCHEMA_VERSION = 3 as const;

/** Maps to Quant Practice generators (`lib/generators/quant`). */
export type GeneratorId = QuantSkillId;

/** Pack id slug, e.g. `u1-dice`. */
export type PackId = string;

/** Collection id slug, e.g. `c-foundations`. */
export type CollectionId = string;

/**
 * Child of a Learn collection: another collection (nest deeper) or a leaf unit pack.
 * Depth is unlimited in schema; UI uses breadcrumbs.
 */
export type CollectionChild =
  | { kind: 'collection'; id: CollectionId }
  | { kind: 'pack'; id: PackId };

/**
 * Nested Learn folder. Not a fixed book/chapter level — any collection may
 * contain collections and/or packs.
 */
export type LearnCollection = {
  id: CollectionId;
  title: string;
  blurb?: string;
  children: CollectionChild[];
};

// ——— Spaced-repetition policies (learner-selectable later) ———

/**
 * Named mix policies. Runtime today always uses `standard` (pack-authored
 * `drill.newShare` ≈ current ~25–30% prior when a review pool exists).
 * Other ids are schema-ready for a future learner picker.
 */
export type SpacedRepPolicyId = 'none' | 'light' | 'standard' | 'heavy';

export type SpacedRepPolicy = {
  id: SpacedRepPolicyId;
  label: string;
  /**
   * Target share of N from prior topics (0–1).
   * For `standard`, packs keep an authored `newShare` so U2/U3 can differ
   * within the ~25–30% band; this field is the nominal mid (~27.5%).
   */
  reviewShare: number;
  blurb: string;
};

export const SPACED_REP_POLICIES: Record<SpacedRepPolicyId, SpacedRepPolicy> = {
  none: {
    id: 'none',
    label: 'None',
    reviewShare: 0,
    blurb: '100% new topic — no prior-topic review',
  },
  light: {
    id: 'light',
    label: 'Light',
    reviewShare: 0.15,
    blurb: '~15% prior topics',
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    reviewShare: 0.275,
    blurb: '~25–30% prior topics (current Learn curriculum)',
  },
  heavy: {
    id: 'heavy',
    label: 'Heavy',
    reviewShare: 0.4,
    blurb: '~40% prior topics',
  },
};

/** Runtime policy until a learner picker exists. */
export const RUNTIME_SPACED_REP_POLICY: SpacedRepPolicyId = 'standard';

// ——— Curriculum graph ———

/**
 * How this unit links to others — for imported packs, unlock rules (later),
 * display order hints, and default spaced-repetition pools.
 */
export type PackLinks = {
  /** Pack ids that immediately precede this unit on the path. */
  before: PackId[];
  /** Pack ids that immediately follow this unit on the path. */
  after: PackId[];
  /**
   * Pack ids required before unlock (future sequential mode).
   * Also the default source set for deriving `reviewTopicTags` when omitted.
   * Often equals `before` (or a transitive closure of priors).
   */
  prerequisites: PackId[];
};

export type PackDefinition = {
  term: string;
  body: string;
};

/**
 * Try-first worked example. Lesson UI shows title + prompt only; the learner
 * attempts with the Quant pad (Scratch / Hint / Submit / Show solution).
 * `steps` + `answer` are revealed after submit or Show solution — never dumped
 * on the lesson screen before an attempt.
 */
export type PackExample = {
  title: string;
  prompt: string;
  /** Canonical answer string (integer or reduced `n/d`) for grading via `answersMatch`. */
  answer: string;
  /** Worked solution lines shown only after reveal. */
  steps: string[];
  /** Optional hint shown from the example attempt UI (same as Practice). */
  hint?: string;
};

export type PackLesson = {
  /** 1–2 sentences: what this unit unlocks / why it matters. */
  intro: string;
  definitions: PackDefinition[];
  examples: PackExample[];
};

export type PackDrill = {
  /** Fixed questions in the practice block. */
  n: number;
  /**
   * Pack-authored new-topic share (0–1) for the **standard / current** mix.
   * Used when the active policy is `standard`. Other policies ignore this and
   * use `SPACED_REP_POLICIES[id].reviewShare` instead.
   */
  newShare: number;
  /** Generator ids for this unit’s new topic. */
  newTopicTags: GeneratorId[];
  /**
   * Generator ids for spaced review. If omitted or empty, runtime derives the
   * pool from `links.prerequisites` (fallback: `links.before`) by unioning
   * those packs’ `newTopicTags`.
   */
  reviewTopicTags?: GeneratorId[];
};

export type PackMeta = {
  /** Stable slug used in routes, e.g. `u1-dice`. */
  id: PackId;
  /** Content revision (independent of schemaVersion). */
  version: number;
  schemaVersion: typeof CONTENT_PACK_SCHEMA_VERSION;
  title: string;
  /**
   * Display order hint (1-based). Authoritative placement is the parent
   * collection’s `children` array.
   */
  order: number;
  blurb: string;
  /** Curriculum edges + prerequisites for order / SR pools / future unlock. */
  links: PackLinks;
};

/**
 * One Learn unit: lesson copy + drill mix config + graph links.
 * Authors add packs as TS modules matching this shape — no new screens required.
 * Placement in the Learn tree is via `LearnCollection.children`.
 */
export type ContentPack = {
  meta: PackMeta;
  lesson: PackLesson;
  drill: PackDrill;
};
