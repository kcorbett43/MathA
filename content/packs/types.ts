import type { QuantSkillId } from '@/lib/quantTypes';

/**
 * Bump when the pack JSON/TS shape breaks consumers.
 * v2: pack graph links + named spaced-repetition policies.
 * v3: nested Learn **collections** tree (unlimited depth) + breadcrumb nav.
 * v4: unit-scoped **flash cards** (`id` / `front` / `back`) for Review.
 * v5: optional lesson / practice / review; authored answer types; review
 *     kinds (basic / reversible / cloze); content-store + `.matha` import.
 */
export const CONTENT_PACK_SCHEMA_VERSION = 5 as const;

/** Maps to Quant Practice generators (`lib/generators/quant`). */
export type GeneratorId = QuantSkillId;

/** Pack / unit id slug, e.g. `u1-dice` or namespaced `pkg.prob.u1-dice`. */
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
 * `drill.newShare` / practice `generatorNewShare` ≈ current ~25–30% prior).
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
    blurb: '100% new — no prior-topic review',
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
   * Also the default source set for deriving review generators when omitted.
   */
  prerequisites: PackId[];
};

export type PackDefinition = {
  term: string;
  body: string;
};

export type Attribution = {
  author?: string;
  license?: string;
  sourceUrl?: string;
  notes?: string;
};

/** Graded answer kinds for authored practice / lesson examples (v1). */
export type AnswerType =
  | 'rational'
  | 'integer'
  | 'text'
  | 'choice'
  | 'multiChoice'
  | 'manual';

export type ChoiceOption = {
  id: string;
  label: string;
};

/**
 * Flash card for this unit’s Review deck (v4 basic shape).
 * Prefer `review.sources` in v5; `cards[]` is still accepted and normalized.
 */
export type PackCard = {
  /** Stable id within the pack. */
  id: string;
  /** Prompt / term / formula name shown first. */
  front: string;
  /** Definition, formula, or short explanation. */
  back: string;
  tags?: string[];
};

export type ReviewCardRef = {
  /** Stable card id — progress keys off this. */
  id: string;
  /** For reversible sources. */
  direction?: 'forward' | 'reverse';
  /** For cloze sources (1-based index into cloze deletions). */
  clozeIndex?: number;
};

export type ReviewSourceKind = 'basic' | 'reversible' | 'cloze';

/**
 * Author source note that expands to one or more study cards.
 * Progress is per expanded card id, not the source alone.
 */
export type ReviewSource = {
  id: string;
  kind: ReviewSourceKind;
  /** Front text (basic / reversible). */
  front?: string;
  /** Back text (basic / reversible). */
  back?: string;
  /** Cloze source text with `{{cN::answer}}` or `{{cN::answer::hint}}` markers. */
  text?: string;
  cards: ReviewCardRef[];
  tags?: string[];
};

export type PackReview = {
  sources: ReviewSource[];
};

/**
 * Try-first worked example. Lesson UI shows title + prompt only; the learner
 * attempts with the Quant pad (Scratch / Hint / Submit / Show solution).
 * `steps` + graded answer are revealed after submit or Show solution.
 */
export type PackExample = {
  id?: string;
  title: string;
  prompt: string;
  answerType?: AnswerType;
  /**
   * Canonical answer for auto-grade types.
   * `choice` → option id; `multiChoice` → option id array; others → string.
   */
  answer?: string | string[];
  aliases?: string[];
  choices?: ChoiceOption[];
  /** Worked solution lines shown only after reveal. */
  steps: string[];
  /** Optional hint shown from the example attempt UI (same as Practice). */
  hint?: string;
};

export type PackLesson = {
  /** 1–2 sentences: what this unit unlocks / why it matters. */
  intro?: string;
  definitions?: PackDefinition[];
  examples?: PackExample[];
};

export type AuthoredQuestion = {
  id: string;
  prompt: string;
  answerType: AnswerType;
  /** Canonical answer — see PackExample.answer. */
  answer?: string | string[];
  aliases?: string[];
  choices?: ChoiceOption[];
  tags?: string[];
  hint?: string;
  steps?: string[];
};

/**
 * Practice activity: authored questions + built-in generator refs + session mix.
 * Package payloads never embed generator code.
 */
export type PackPractice = {
  /** Session length (question count). */
  sessionSize: number;
  /**
   * Authored vs generated shares (0–1). Should sum to ~1.
   * Counts are derived: authoredCount = round(n × authored), rest generated.
   */
  mix: { authored: number; generated: number };
  /** Built-in generator ids only (`dice` | `urns` | `ev`). */
  generators?: GeneratorId[];
  questions?: AuthoredQuestion[];
  /**
   * Store/runtime only (not in `.matha`): new-topic share among *generated*
   * slots for shipped curriculum spaced review. Defaults to 1.
   */
  generatorNewShare?: number;
  /** Store/runtime only: explicit review generator pool. */
  reviewGenerators?: GeneratorId[];
};

/**
 * @deprecated v4 drill shape — normalized to `practice` on load.
 * Kept so existing TS pack modules compile until rewritten.
 */
export type PackDrill = {
  n: number;
  newShare: number;
  newTopicTags: GeneratorId[];
  reviewTopicTags?: GeneratorId[];
};

export type PackMeta = {
  /** Stable slug used in routes / store, e.g. `u1-dice`. */
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
  tags?: string[];
  attribution?: Attribution;
  /** Owning package id when installed via `.matha` or shipped seed. */
  packageId?: string;
  /** Curriculum edges + prerequisites for order / SR pools / future unlock. */
  links: PackLinks;
};

/**
 * One Learn unit. Activities are independently optional; at least one of
 * lesson / practice / review is required (empty units fail validation).
 *
 * Placement in the Learn tree is via `LearnCollection.children`.
 * Legacy `cards` / `drill` are accepted on TS packs and normalized to
 * `review` / `practice`.
 */
export type ContentPack = {
  meta: PackMeta;
  lesson?: PackLesson;
  practice?: PackPractice;
  review?: PackReview;
  /** @deprecated Prefer `review.sources`. Normalized on load. */
  cards?: PackCard[];
  /** @deprecated Prefer `practice`. Normalized on load. */
  drill?: PackDrill;
};

/** Built-in generator ids known to the app. */
export const KNOWN_GENERATOR_IDS: readonly GeneratorId[] = ['dice', 'urns', 'ev'] as const;

export function isKnownGeneratorId(id: string): id is GeneratorId {
  return (KNOWN_GENERATOR_IDS as readonly string[]).includes(id);
}
