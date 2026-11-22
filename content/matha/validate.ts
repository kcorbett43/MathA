import {
  CONTENT_PACK_SCHEMA_VERSION,
  isKnownGeneratorId,
  type AnswerType,
  type AuthoredQuestion,
  type ContentPack,
  type GeneratorId,
  type PackExample,
  type PackLesson,
  type PackPractice,
  type PackReview,
  type ReviewSource,
} from '@/content/packs/types';
import { unitHasActivity } from '@/content/packs/normalize';
import { MATHA_FORMAT_VERSION } from '@/content/store/types';

import type {
  MathaManifest,
  MathaTree,
  ParsedMathaPackage,
  ValidationIssue,
} from './types';

const ANSWER_TYPES: AnswerType[] = [
  'rational',
  'integer',
  'text',
  'choice',
  'multiChoice',
  'manual',
];

export type ValidatedMatha = {
  manifest: MathaManifest;
  tree: MathaTree | null;
  units: ContentPack[];
  issues: ValidationIssue[];
  /** SHA-ish fingerprint of normalized content for same-revision no-op. */
  contentFingerprint: string;
};

export function validateParsedPackage(parsed: ParsedMathaPackage): ValidatedMatha {
  const issues: ValidationIssue[] = [];
  const { manifest, tree, units: rawUnits, assets } = parsed;

  if (!manifest.packageId || typeof manifest.packageId !== 'string') {
    issues.push({
      level: 'error',
      code: 'manifest.packageId',
      message: 'manifest.packageId is required',
      path: 'manifest.json',
    });
  }
  if (!Number.isInteger(manifest.revision) || manifest.revision < 1) {
    issues.push({
      level: 'error',
      code: 'manifest.revision',
      message: 'manifest.revision must be a positive integer',
      path: 'manifest.json',
    });
  }
  if (manifest.formatVersion !== MATHA_FORMAT_VERSION) {
    issues.push({
      level: 'error',
      code: 'manifest.formatVersion',
      message: `Unsupported formatVersion ${manifest.formatVersion}; app supports ${MATHA_FORMAT_VERSION}`,
      path: 'manifest.json',
    });
  }

  const unitIds = Object.keys(rawUnits);
  if (unitIds.length === 0) {
    issues.push({
      level: 'error',
      code: 'units.empty',
      message: 'Package contains no units',
    });
  }

  const seenIds = new Set<string>();
  const units: ContentPack[] = [];

  for (const unitId of unitIds) {
    const raw = rawUnits[unitId];
    const path = `units/${unitId}/unit.json`;
    const unit = parseUnitJson(raw, unitId, path, assets, issues);
    if (!unit) continue;

    if (seenIds.has(unit.meta.id)) {
      issues.push({
        level: 'error',
        code: 'id.duplicate',
        message: `Duplicate unit id ${unit.meta.id}`,
        path,
      });
    }
    seenIds.add(unit.meta.id);

    if (!unitHasActivity(unit)) {
      issues.push({
        level: 'error',
        code: 'unit.empty',
        message: `Unit ${unit.meta.id} has no lesson, practice, or review`,
        path,
      });
    }

    // Collect nested ids (questions, cards)
    collectNestedIds(unit, path, seenIds, issues);
    units.push(unit);
  }

  if (tree) {
    validateTree(tree, new Set(units.map((u) => u.meta.id)), issues);
  } else if (units.length !== 1 && manifest.scope !== 'unit') {
    issues.push({
      level: 'error',
      code: 'tree.missing',
      message: 'tree.json required when package has multiple units or collection scope',
    });
  }

  // Asset refs already checked in parseUnitJson via collectAssetRefs
  const contentFingerprint = fingerprintUnits(units);

  return { manifest, tree, units, issues, contentFingerprint };
}

function parseUnitJson(
  raw: unknown,
  folderId: string,
  path: string,
  assets: Record<string, Uint8Array>,
  issues: ValidationIssue[],
): ContentPack | null {
  if (!raw || typeof raw !== 'object') {
    issues.push({ level: 'error', code: 'unit.json', message: 'Invalid unit.json', path });
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const metaRaw = obj.meta as Record<string, unknown> | undefined;
  if (!metaRaw || typeof metaRaw.id !== 'string') {
    issues.push({ level: 'error', code: 'unit.meta', message: 'meta.id required', path });
    return null;
  }
  if (metaRaw.id !== folderId) {
    issues.push({
      level: 'warning',
      code: 'unit.id.mismatch',
      message: `Folder ${folderId} vs meta.id ${metaRaw.id}`,
      path,
    });
  }

  const lesson = obj.lesson ? parseLesson(obj.lesson, path, assets, issues) : undefined;
  const practice = obj.practice
    ? parsePractice(obj.practice, path, assets, issues)
    : undefined;
  const review = obj.review ? parseReview(obj.review, path, assets, issues) : undefined;

  const version =
    typeof metaRaw.version === 'number' && Number.isInteger(metaRaw.version)
      ? metaRaw.version
      : 1;

  return {
    meta: {
      id: metaRaw.id,
      version,
      schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
      title: String(metaRaw.title ?? metaRaw.id),
      order: typeof metaRaw.order === 'number' ? metaRaw.order : 1,
      blurb: String(metaRaw.blurb ?? ''),
      tags: Array.isArray(metaRaw.tags) ? metaRaw.tags.map(String) : undefined,
      attribution:
        metaRaw.attribution && typeof metaRaw.attribution === 'object'
          ? (metaRaw.attribution as ContentPack['meta']['attribution'])
          : undefined,
      links:
        metaRaw.links && typeof metaRaw.links === 'object'
          ? {
              before: arr(metaRaw.links, 'before'),
              after: arr(metaRaw.links, 'after'),
              prerequisites: arr(metaRaw.links, 'prerequisites'),
            }
          : { before: [], after: [], prerequisites: [] },
    },
    lesson,
    practice,
    review,
  };
}

function arr(obj: unknown, key: string): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const v = (obj as Record<string, unknown>)[key];
  return Array.isArray(v) ? v.map(String) : [];
}

function parseLesson(
  raw: unknown,
  path: string,
  assets: Record<string, Uint8Array>,
  issues: ValidationIssue[],
): PackLesson | undefined {
  if (!raw || typeof raw !== 'object') {
    issues.push({ level: 'error', code: 'lesson.invalid', message: 'Invalid lesson', path });
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const definitions = Array.isArray(o.definitions)
    ? o.definitions.map((d, i) => {
        const def = d as { term?: string; body?: string };
        checkContentString(def.body ?? '', `${path}/lesson/definitions/${i}`, assets, issues);
        return { term: String(def.term ?? ''), body: String(def.body ?? '') };
      })
    : [];
  const examples: PackExample[] = Array.isArray(o.examples)
    ? o.examples.map((ex, i) => parseExample(ex, `${path}/lesson/examples/${i}`, assets, issues))
    : [];
  if (typeof o.intro === 'string') {
    checkContentString(o.intro, `${path}/lesson/intro`, assets, issues);
  }
  return {
    intro: typeof o.intro === 'string' ? o.intro : undefined,
    definitions,
    examples,
  };
}

function parseExample(
  raw: unknown,
  path: string,
  assets: Record<string, Uint8Array>,
  issues: ValidationIssue[],
): PackExample {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  checkContentString(String(o.prompt ?? ''), `${path}/prompt`, assets, issues);
  const answerType = parseAnswerType(o.answerType, path, issues) ?? 'rational';
  validateAnswerPayload(answerType, o, path, issues);
  return {
    id: typeof o.id === 'string' ? o.id : undefined,
    title: String(o.title ?? 'Example'),
    prompt: String(o.prompt ?? ''),
    answerType,
    answer: o.answer as string | string[] | undefined,
    aliases: Array.isArray(o.aliases) ? o.aliases.map(String) : undefined,
    choices: parseChoices(o.choices),
    steps: Array.isArray(o.steps) ? o.steps.map(String) : [],
    hint: typeof o.hint === 'string' ? o.hint : undefined,
  };
}

function parsePractice(
  raw: unknown,
  path: string,
  assets: Record<string, Uint8Array>,
  issues: ValidationIssue[],
): PackPractice | undefined {
  if (!raw || typeof raw !== 'object') {
    issues.push({ level: 'error', code: 'practice.invalid', message: 'Invalid practice', path });
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const sessionSize = Number(o.sessionSize ?? o.n);
  if (!Number.isInteger(sessionSize) || sessionSize < 1) {
    issues.push({
      level: 'error',
      code: 'practice.sessionSize',
      message: 'practice.sessionSize must be a positive integer',
      path,
    });
  }
  const mixRaw = (o.mix ?? {}) as { authored?: number; generated?: number };
  const mix = {
    authored: Number(mixRaw.authored ?? 0),
    generated: Number(mixRaw.generated ?? 0),
  };
  if (mix.authored < 0 || mix.generated < 0 || mix.authored + mix.generated <= 0) {
    issues.push({
      level: 'error',
      code: 'practice.mix',
      message: 'practice.mix must have non-negative authored/generated shares summing > 0',
      path,
    });
  }

  const generators: GeneratorId[] = [];
  if (Array.isArray(o.generators)) {
    for (const g of o.generators) {
      const id = String(g);
      if (!isKnownGeneratorId(id)) {
        // Hard fail — never silent discard (spec §5 / §11)
        issues.push({
          level: 'error',
          code: 'practice.generator.unknown',
          message: `Unknown generator id "${id}" — install blocked`,
          path: `${path}/generators`,
        });
      } else {
        generators.push(id);
      }
    }
  }

  const questions: AuthoredQuestion[] = Array.isArray(o.questions)
    ? o.questions.map((q, i) =>
        parseQuestion(q, `${path}/questions/${i}`, assets, issues),
      )
    : [];

  if (mix.generated > 0 && generators.length === 0) {
    issues.push({
      level: 'error',
      code: 'practice.generators.required',
      message: 'practice.mix.generated > 0 requires at least one known generator',
      path,
    });
  }
  if (mix.authored > 0 && questions.filter((q) => q.answerType !== 'manual').length === 0) {
    const autoCount = questions.length;
    if (autoCount === 0) {
      issues.push({
        level: 'error',
        code: 'practice.questions.required',
        message: 'practice.mix.authored > 0 requires authored questions',
        path,
      });
    }
  }

  for (const q of questions) {
    if (q.answerType === 'manual') {
      issues.push({
        level: 'warning',
        code: 'practice.manual',
        message: `Question ${q.id}: manual questions need review UI (self-mark placeholder at runtime)`,
        path,
      });
    }
  }

  return {
    sessionSize: Number.isFinite(sessionSize) ? sessionSize : 1,
    mix,
    generators,
    questions,
  };
}

function parseQuestion(
  raw: unknown,
  path: string,
  assets: Record<string, Uint8Array>,
  issues: ValidationIssue[],
): AuthoredQuestion {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const id = String(o.id ?? '');
  if (!id) {
    issues.push({ level: 'error', code: 'question.id', message: 'question.id required', path });
  }
  checkContentString(String(o.prompt ?? ''), `${path}/prompt`, assets, issues);
  const answerType = parseAnswerType(o.answerType, path, issues) ?? 'text';
  validateAnswerPayload(answerType, o, path, issues);
  return {
    id: id || `anon-${path}`,
    prompt: String(o.prompt ?? ''),
    answerType,
    answer: o.answer as string | string[] | undefined,
    aliases: Array.isArray(o.aliases) ? o.aliases.map(String) : undefined,
    choices: parseChoices(o.choices),
    tags: Array.isArray(o.tags) ? o.tags.map(String) : undefined,
    hint: typeof o.hint === 'string' ? o.hint : undefined,
    steps: Array.isArray(o.steps) ? o.steps.map(String) : undefined,
  };
}

function parseReview(
  raw: unknown,
  path: string,
  assets: Record<string, Uint8Array>,
  issues: ValidationIssue[],
): PackReview | undefined {
  if (!raw || typeof raw !== 'object') {
    issues.push({ level: 'error', code: 'review.invalid', message: 'Invalid review', path });
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.sources) || o.sources.length === 0) {
    issues.push({
      level: 'error',
      code: 'review.sources',
      message: 'review.sources must be a non-empty array',
      path,
    });
    return { sources: [] };
  }
  const sources: ReviewSource[] = o.sources.map((s, i) =>
    parseReviewSource(s, `${path}/sources/${i}`, assets, issues),
  );
  return { sources };
}

function parseReviewSource(
  raw: unknown,
  path: string,
  assets: Record<string, Uint8Array>,
  issues: ValidationIssue[],
): ReviewSource {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const id = String(o.id ?? '');
  const kind = String(o.kind ?? 'basic') as ReviewSource['kind'];
  if (!['basic', 'reversible', 'cloze'].includes(kind)) {
    issues.push({
      level: 'error',
      code: 'review.kind',
      message: `Invalid review kind "${kind}"`,
      path,
    });
  }
  if (!id) {
    issues.push({ level: 'error', code: 'review.source.id', message: 'source.id required', path });
  }
  if (kind === 'cloze') {
    checkContentString(String(o.text ?? ''), `${path}/text`, assets, issues);
    if (!o.text || !/\{\{c\d+::/.test(String(o.text))) {
      issues.push({
        level: 'error',
        code: 'review.cloze',
        message: 'cloze source requires text with {{cN::…}} markers',
        path,
      });
    }
  } else {
    checkContentString(String(o.front ?? ''), `${path}/front`, assets, issues);
    checkContentString(String(o.back ?? ''), `${path}/back`, assets, issues);
  }
  const cards = Array.isArray(o.cards)
    ? o.cards.map((c) => {
        const card = c as { id?: string; direction?: string; clozeIndex?: number };
        if (!card.id) {
          issues.push({
            level: 'error',
            code: 'review.card.id',
            message: 'card.id required',
            path,
          });
        }
        return {
          id: String(card.id ?? ''),
          direction: card.direction as 'forward' | 'reverse' | undefined,
          clozeIndex: card.clozeIndex,
        };
      })
    : [];
  if (cards.length === 0) {
    issues.push({
      level: 'error',
      code: 'review.cards',
      message: 'Each review source must declare at least one card id',
      path,
    });
  }
  return {
    id: id || `src-${path}`,
    kind: ['basic', 'reversible', 'cloze'].includes(kind) ? kind : 'basic',
    front: typeof o.front === 'string' ? o.front : undefined,
    back: typeof o.back === 'string' ? o.back : undefined,
    text: typeof o.text === 'string' ? o.text : undefined,
    cards,
    tags: Array.isArray(o.tags) ? o.tags.map(String) : undefined,
  };
}

function parseAnswerType(
  raw: unknown,
  path: string,
  issues: ValidationIssue[],
): AnswerType | undefined {
  if (raw == null) return undefined;
  const t = String(raw);
  if (!ANSWER_TYPES.includes(t as AnswerType)) {
    issues.push({
      level: 'error',
      code: 'answerType',
      message: `Unsupported answerType "${t}"`,
      path,
    });
    return undefined;
  }
  if (t === 'expression') {
    issues.push({
      level: 'error',
      code: 'answerType.deferred',
      message: 'expression grading is deferred; use rational/integer/text/choice',
      path,
    });
  }
  return t as AnswerType;
}

function validateAnswerPayload(
  answerType: AnswerType,
  o: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): void {
  if (answerType === 'manual') return;
  if (answerType === 'choice' || answerType === 'multiChoice') {
    const choices = parseChoices(o.choices);
    if (!choices || choices.length < 2) {
      issues.push({
        level: 'error',
        code: 'choices',
        message: `${answerType} requires choices[] with ≥2 options`,
        path,
      });
    }
    if (answerType === 'choice' && typeof o.answer !== 'string') {
      issues.push({
        level: 'error',
        code: 'answer.choice',
        message: 'choice answer must be an option id string',
        path,
      });
    }
    if (answerType === 'multiChoice' && !Array.isArray(o.answer)) {
      issues.push({
        level: 'error',
        code: 'answer.multiChoice',
        message: 'multiChoice answer must be an array of option ids',
        path,
      });
    }
  } else if (o.answer == null || (typeof o.answer !== 'string' && !Array.isArray(o.answer))) {
    issues.push({
      level: 'error',
      code: 'answer.missing',
      message: `${answerType} requires an answer`,
      path,
    });
  }
}

function parseChoices(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((c) => {
    const o = c as { id?: string; label?: string };
    return { id: String(o.id ?? ''), label: String(o.label ?? '') };
  });
}

/** Markdown subset + asset refs: fail if `![…](path)` or audio refs missing. */
function checkContentString(
  text: string,
  path: string,
  assets: Record<string, Uint8Array>,
  issues: ValidationIssue[],
): void {
  const re = /!\[[^\]]*]\(([^)]+)\)|<audio[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const ref = (m[1] || m[2] || '').trim();
    if (!ref || ref.startsWith('http://') || ref.startsWith('https://')) continue;
    const normalized = ref.replace(/^\.\//, '');
    if (!assets[normalized]) {
      issues.push({
        level: 'error',
        code: 'asset.missing',
        message: `Missing asset "${normalized}"`,
        path,
      });
    }
  }
}

function validateTree(
  tree: MathaTree,
  unitIds: Set<string>,
  issues: ValidationIssue[],
): void {
  const colMap = new Map(tree.collections.map((c) => [c.id, c]));
  const roots = tree.roots ?? tree.collections.map((c) => c.id).slice(0, 1);
  if (roots.length === 0) {
    issues.push({
      level: 'error',
      code: 'tree.roots',
      message: 'tree.roots must list at least one collection',
    });
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(colId: string) {
    if (visiting.has(colId)) {
      issues.push({
        level: 'error',
        code: 'tree.cycle',
        message: `Cycle detected at collection ${colId}`,
      });
      return;
    }
    if (visited.has(colId)) return;
    const col = colMap.get(colId);
    if (!col) {
      issues.push({
        level: 'error',
        code: 'tree.collection.missing',
        message: `Unknown collection ${colId}`,
      });
      return;
    }
    visiting.add(colId);
    for (const child of col.children) {
      if (child.kind === 'collection') {
        walk(child.id);
      } else {
        const uid = child.id;
        if (!unitIds.has(uid)) {
          issues.push({
            level: 'error',
            code: 'tree.unit.missing',
            message: `Tree references missing unit ${uid}`,
          });
        }
      }
    }
    visiting.delete(colId);
    visited.add(colId);
  }

  for (const r of roots) walk(r);

  for (const c of tree.collections) {
    if (!visited.has(c.id) && !roots.includes(c.id)) {
      // orphan collections still validated for cycles if reachable — warn
      issues.push({
        level: 'warning',
        code: 'tree.orphan',
        message: `Collection ${c.id} is not under any root`,
      });
    }
  }
}

function collectNestedIds(
  unit: ContentPack,
  path: string,
  seen: Set<string>,
  issues: ValidationIssue[],
): void {
  const mark = (id: string, kind: string) => {
    const key = `${kind}:${id}`;
    // Card/question ids must be unique within the package namespace — use full id
    if (seen.has(id)) {
      issues.push({
        level: 'error',
        code: 'id.duplicate',
        message: `Duplicate id "${id}" (${kind})`,
        path,
      });
    }
    seen.add(id);
    void key;
  };

  for (const q of unit.practice?.questions ?? []) {
    if (q.id) mark(q.id, 'question');
  }
  for (const src of unit.review?.sources ?? []) {
    if (src.id) mark(src.id, 'source');
    for (const c of src.cards) {
      if (c.id) mark(c.id, 'card');
    }
  }
}

function fingerprintUnits(units: ContentPack[]): string {
  const payload = JSON.stringify(
    units
      .map((u) => ({
        id: u.meta.id,
        version: u.meta.version,
        title: u.meta.title,
        lesson: u.lesson,
        practice: u.practice
          ? {
              sessionSize: u.practice.sessionSize,
              mix: u.practice.mix,
              generators: u.practice.generators,
              questions: u.practice.questions,
            }
          : undefined,
        review: u.review,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
  // Simple non-crypto fingerprint
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  }
  return `h${h >>> 0}`;
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
