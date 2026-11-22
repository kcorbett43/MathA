import type {
  ContentPack,
  GeneratorId,
  PackCard,
  PackPractice,
  PackReview,
  ReviewSource,
} from './types';
import { CONTENT_PACK_SCHEMA_VERSION } from './types';

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

export function getPractice(pack: ContentPack): PackPractice | undefined {
  if (pack.practice) return pack.practice;
  if (pack.drill) {
    return {
      sessionSize: pack.drill.n,
      mix: { authored: 0, generated: 1 },
      generators: [...pack.drill.newTopicTags],
      generatorNewShare: pack.drill.newShare,
      reviewGenerators: pack.drill.reviewTopicTags
        ? [...pack.drill.reviewTopicTags]
        : undefined,
      questions: [],
    };
  }
  return undefined;
}

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
        const del = deletions.find((d) => d.n === idx) ?? deletions[idx - 1];
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

type ClozeDeletion = { n: number; answer: string; hint?: string };

function parseClozeDeletions(text: string): ClozeDeletion[] {
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

/** Normalize a pack to v5 shape (practice/review filled; schemaVersion set). */
export function normalizePack(pack: ContentPack): ContentPack {
  const practice = getPractice(pack);
  const review = getReview(pack);
  const lesson = pack.lesson;
  return {
    meta: {
      ...pack.meta,
      schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
      links: pack.meta.links ?? { before: [], after: [], prerequisites: [] },
    },
    lesson,
    practice,
    review,
    // Drop legacy mirrors after normalize
  };
}

export function practiceGenerators(pack: ContentPack): GeneratorId[] {
  return getPractice(pack)?.generators ?? [];
}
