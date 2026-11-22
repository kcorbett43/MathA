import type { QuantSkillId } from '@/lib/quantTypes';

/** Bump when the pack JSON/TS shape breaks consumers. */
export const CONTENT_PACK_SCHEMA_VERSION = 1 as const;

/** Maps to Quant Practice generators (`lib/generators/quant`). */
export type GeneratorId = QuantSkillId;

export type PackDefinition = {
  term: string;
  body: string;
};

export type PackExample = {
  title: string;
  prompt: string;
  steps: string[];
  answer: string;
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
   * Fraction of N drawn from `newTopicTags` (0–1).
   * Review count = n − round(n × newShare).
   */
  newShare: number;
  /** Generator ids for this unit’s new topic. */
  newTopicTags: GeneratorId[];
  /** Generator ids from earlier units (spaced review). Empty → 100% new. */
  reviewTopicTags: GeneratorId[];
};

export type PackMeta = {
  /** Stable slug used in routes, e.g. `u1-dice`. */
  id: string;
  /** Content revision (independent of schemaVersion). */
  version: number;
  schemaVersion: typeof CONTENT_PACK_SCHEMA_VERSION;
  title: string;
  /** Display order (1-based). */
  order: number;
  blurb: string;
};

/**
 * One Learn unit: lesson copy + drill mix config.
 * Authors add packs as TS modules matching this shape — no new screens required.
 */
export type ContentPack = {
  meta: PackMeta;
  lesson: PackLesson;
  drill: PackDrill;
};
