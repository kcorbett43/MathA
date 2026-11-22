import { answersMatch } from '@/lib/fraction';

import type { AnswerType } from '@/content/packs/types';

export type GradeResult =
  | { kind: 'auto'; correct: boolean }
  | { kind: 'manual'; correct: null };

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Grade an authored answer. `manual` never auto-grades.
 */
export function gradeAuthoredAnswer(
  answerType: AnswerType,
  user: string | string[],
  canonical: string | string[] | undefined,
  aliases?: string[],
): GradeResult {
  if (answerType === 'manual') {
    return { kind: 'manual', correct: null };
  }

  if (canonical == null) {
    return { kind: 'auto', correct: false };
  }

  switch (answerType) {
    case 'rational': {
      const u = Array.isArray(user) ? user[0] ?? '' : user;
      const c = Array.isArray(canonical) ? canonical[0] ?? '' : canonical;
      return { kind: 'auto', correct: answersMatch(u, c) };
    }
    case 'integer': {
      const u = String(Array.isArray(user) ? user[0] ?? '' : user)
        .trim()
        .replace(/^0+(?=\d)/, '');
      const c = String(Array.isArray(canonical) ? canonical[0] ?? '' : canonical)
        .trim()
        .replace(/^0+(?=\d)/, '');
      if (!/^-?\d+$/.test(u) || !/^-?\d+$/.test(c)) {
        return { kind: 'auto', correct: false };
      }
      return { kind: 'auto', correct: Number(u) === Number(c) };
    }
    case 'text': {
      const u = normalizeText(Array.isArray(user) ? user[0] ?? '' : user);
      const candidates = [
        Array.isArray(canonical) ? canonical[0] ?? '' : canonical,
        ...(aliases ?? []),
      ].map(normalizeText);
      return { kind: 'auto', correct: candidates.includes(u) };
    }
    case 'choice': {
      const u = Array.isArray(user) ? user[0] ?? '' : user;
      const c = Array.isArray(canonical) ? canonical[0] ?? '' : canonical;
      return { kind: 'auto', correct: u === c };
    }
    case 'multiChoice': {
      const u = new Set(Array.isArray(user) ? user : [user]);
      const c = new Set(Array.isArray(canonical) ? canonical : [canonical]);
      if (u.size !== c.size) return { kind: 'auto', correct: false };
      for (const id of u) {
        if (!c.has(id)) return { kind: 'auto', correct: false };
      }
      return { kind: 'auto', correct: true };
    }
    default:
      return { kind: 'auto', correct: false };
  }
}
