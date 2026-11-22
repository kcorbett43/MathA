import type {
  ContentPack,
  GeneratorId,
  PackCard,
  PackPractice,
  PackReview,
  ReviewSource,
} from './types';
import { CONTENT_PACK_SCHEMA_VERSION } from './types';

export type NormalizeIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
};

/** True when the unit has at least one activity with content. */
export function unitHasActivity(pack: ContentPack): boolean {
  return Boolean(getLesson(pack) || getPractice(pack) || getReview(pack));
}

export function getLesson(pack: ContentPack) {
  const lesson = pack.lesson;
  if (!lesson) return undefined;
  const hasIntro = Boolean(lesson.intro?.trim());
  const hasDefs = (lesson.definitions?.length ?? 0) > 0;
  const hasExamples = (lesson.examples?.length ?? 0) > 0;
  if (!hasIntro && !hasDefs && !hasExamples) return undefined;
  return lesson;
}

/**
 * Prefer canonical `practice`. Legacy `drill` is used only when `practice` is absent.
 * Callers that need conflict detection should use `normalizePackDetailed`.
 */
export function getPractice(pack: ContentPack): PackPractice | undefined {
  if (pack.practice) return pack.practice;
  if (pack.drill) return drillToPractice(pack);
  return undefined;
}

function drillToPractice(pack: ContentPack): PackPractice {
  const drill = pack.drill!;
  return {
    sessionSize: drill.n,
    mix: { authored: 0, generated: 1 },
    generators: [...drill.newTopicTags],
    generatorNewShare: drill.newShare,
    reviewGenerators: drill.reviewTopicTags ? [...drill.reviewTopicTags] : undefined,
    questions: [],
  };
}

/**
 * Prefer canonical `review`. Legacy `cards` only when `review` is absent.
 */
export function getReview(pack: ContentPack): PackReview | undefined {
  if (pack.review && pack.review.sources.length > 0) return pack.review;
  if (pack.cards && pack.cards.length > 0) {
    return { sources: pack.cards.map(cardToBasicSource) };
  }
  return undefined;
}

function cardToBasicSource(card: PackCard): ReviewSource {
  return {
    id: `src-${card.id}`,
    kind: 'basic',
    front: card.front,
    back: card.back,
    tags: card.tags,
    cards: [{ id: card.id, direction: 'forward' }],
  };
}

/**
 * Expand review sources into flat flip cards (stable ids preserved).
 * Cloze: `{{c1::answer}}` or `{{c1::answer::hint}}`.
 * Card identity is the declared `cards[].id` — authors must assign a **new** id
 * if cloze meaning changes (text/position change with the same id is not renamed).
 */
export type ExpandedReviewCard = {
  id: string;
  sourceId: string;
  front: string;
  back: string;
  tags?: string[];
};

const CLOZE_RE = /\{\{c(\d+)::([^}:]+?)(?:::([^}]+))?\}\}/g;

export function expandReviewCards(pack: ContentPack): ExpandedReviewCard[] {
  const review = getReview(pack);
  if (!review) return [];

  const out: ExpandedReviewCard[] = [];
  for (const source of review.sources) {
    if (source.kind === 'basic') {
      for (const ref of source.cards) {
        out.push({
          id: ref.id,
          sourceId: source.id,
          front: source.front ?? '',
          back: source.back ?? '',
          tags: source.tags,
        });
      }
    } else if (source.kind === 'reversible') {
      for (const ref of source.cards) {
        const forward = ref.direction !== 'reverse';
        out.push({
          id: ref.id,
          sourceId: source.id,
          front: forward ? (source.front ?? '') : (source.back ?? ''),
          back: forward ? (source.back ?? '') : (source.front ?? ''),
          tags: source.tags,
        });
      }
    } else if (source.kind === 'cloze') {
      const text = source.text ?? '';
      const deletions = parseClozeDeletions(text);
      for (const ref of source.cards) {
        const idx = ref.clozeIndex ?? 1;
        const del = deletions.find((d) => d.n === idx);
        out.push({
          id: ref.id,
          sourceId: source.id,
          front: blankCloze(text, idx),
          back: del?.answer ?? '',
          tags: source.tags,
        });
      }
    }
  }
  return out;
}

export type ClozeDeletion = { n: number; answer: string; hint?: string };

export function parseClozeDeletions(text: string): ClozeDeletion[] {
  const out: ClozeDeletion[] = [];
  const re = new RegExp(CLOZE_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ n: Number(m[1]), answer: m[2]!.trim(), hint: m[3]?.trim() });
  }
  return out;
}

function blankCloze(text: string, activeIndex: number): string {
  return text.replace(CLOZE_RE, (_match, nStr, answer, hint) => {
    const n = Number(nStr);
    if (n === activeIndex) return hint ? `[${hint}]` : '[…]';
    return String(answer);
  });
}

/**
 * One-way normalize to canonical v5 (`lesson` / `practice` / `review` only).
 * Legacy `cards` / `drill` are converted when modern fields are absent, then dropped.
 *
 * **Conflict:** if both legacy and modern are present, modern wins and a warning
 * is recorded (import validation treats dual presence as an error).
 */
export function normalizePackDetailed(pack: ContentPack): {
  pack: ContentPack;
  issues: NormalizeIssue[];
} {
  const issues: NormalizeIssue[] = [];

  if (pack.practice && pack.drill) {
    issues.push({
      level: 'warning',
      code: 'normalize.legacy.drill',
      message:
        'Both practice and legacy drill present — using practice; drill ignored',
    });
  }
  if (pack.review?.sources?.length && pack.cards?.length) {
    issues.push({
      level: 'warning',
      code: 'normalize.legacy.cards',
      message:
        'Both review and legacy cards present — using review; cards ignored',
    });
  }

  const practice = pack.practice
    ? pack.practice
    : pack.drill
      ? drillToPractice(pack)
      : undefined;
  const review =
    pack.review && pack.review.sources.length > 0
      ? pack.review
      : pack.cards && pack.cards.length > 0
        ? { sources: pack.cards.map(cardToBasicSource) }
        : undefined;

  return {
    pack: {
      meta: {
        ...pack.meta,
        schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
        links: pack.meta.links ?? { before: [], after: [], prerequisites: [] },
      },
      lesson: pack.lesson,
      practice,
      review,
      // canonical only — no cards/drill mirrors
    },
    issues,
  };
}

/** Normalize a pack to v5 canonical shape (practice/review; no legacy mirrors). */
export function normalizePack(pack: ContentPack): ContentPack {
  return normalizePackDetailed(pack).pack;
}

export function practiceGenerators(pack: ContentPack): GeneratorId[] {
  return getPractice(pack)?.generators ?? [];
}

/** Stable fingerprint of canonical unit content (for revision no-op checks). */
export function fingerprintUnits(units: ContentPack[]): string {
  const payload = JSON.stringify(
    units
      .map((u) => {
        const n = normalizePack(u);
        return {
          id: n.meta.id,
          version: n.meta.version,
          title: n.meta.title,
          lesson: n.lesson,
          practice: n.practice
            ? {
                sessionSize: n.practice.sessionSize,
                mix: n.practice.mix,
                generators: n.practice.generators,
                questions: n.practice.questions,
                generatorNewShare: n.practice.generatorNewShare,
                reviewGenerators: n.practice.reviewGenerators,
              }
            : undefined,
          review: n.review,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  }
  return `h${h >>> 0}`;
}
