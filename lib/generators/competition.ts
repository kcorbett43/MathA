import type { CompetitionMode, Question } from '../types';
import { randInt } from '../random';
import { ADDITION_PROFILES } from './competitionAdditionProfiles';

/** Group D sample progression; index is zero-based and saturates at question 60. */
export function competitionIndex(index: number): number {
  return Math.min(59, Math.max(0, Math.floor(Number.isFinite(index) ? index : 0)));
}

function digits(width: number): number {
  return randInt(width === 1 ? 2 : 10 ** (width - 1), 10 ** width - 1);
}

export function generateCompetitionQuestion(mode: CompetitionMode, index = 0): Question {
  const i = competitionIndex(index);
  if (mode === 'competitionMultiplication') {
    const [leftDigits, rightDigits] = MULTIPLICATION_PROFILES[i];
    const a = digits(leftDigits);
    const b = digits(rightDigits);
    return { prompt: `${a} × ${b}`, answer: String(a * b) };
  }
  if (mode === 'competitionDivision') {
    const [quotientDigits, divisorDigits] = DIVISION_PROFILES[i];
    const quotient = digits(quotientDigits);
    const divisor = digits(divisorDigits);
    return { prompt: `${quotient * divisor} ÷ ${divisor}`, answer: String(quotient) };
  }

  const decimal = i >= 40;
  // Integer cents throughout: no floating-point accumulation or rounded equality.
  const values = ADDITION_PROFILES[i].map(([width, sign]) => {
    const magnitude = decimal
      ? randInt(width === 1 ? 1 : 10 ** (width + 1), 10 ** (width + 2) - 1)
      : randInt(10 ** (width - 1), 10 ** width - 1);
    return sign * magnitude;
  });
  const total = values.reduce((sum, value) => sum + value, 0);
  const terms = values.map((value) => decimal ? (value / 100).toFixed(2) : String(value));
  return {
    prompt: terms.join('\n'),
    terms,
    answer: decimal ? (total / 100).toFixed(2) : String(total),
  };
}

/** Numeric equivalence permits .5 / 0.50 and trailing decimal zeroes. */
export function competitionAnswerMatches(input: string, expected: string): boolean {
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input) && Number(input) === Number(expected);
}

/** Digit widths inferred from https://www.usmentalmath.org/events/competitions/Samples/DM.pdf */
export const MULTIPLICATION_PROFILES: readonly (readonly [number, number])[] = [
  [1, 1], // 1
  [1, 1], // 2
  [1, 1], // 3
  [1, 1], // 4
  [1, 1], // 5
  [1, 1], // 6
  [2, 1], // 7
  [2, 1], // 8
  [2, 1], // 9
  [2, 1], // 10
  [2, 1], // 11
  [2, 1], // 12
  [2, 1], // 13
  [3, 1], // 14
  [3, 1], // 15
  [3, 1], // 16
  [3, 1], // 17
  [3, 1], // 18
  [3, 1], // 19
  [3, 1], // 20
  [2, 2], // 21
  [2, 2], // 22
  [2, 2], // 23
  [2, 2], // 24
  [2, 2], // 25
  [2, 2], // 26
  [2, 2], // 27
  [2, 2], // 28
  [2, 2], // 29
  [2, 2], // 30
  [2, 2], // 31
  [2, 2], // 32
  [2, 2], // 33
  [2, 2], // 34
  [2, 2], // 35
  [2, 2], // 36
  [2, 2], // 37
  [2, 2], // 38
  [2, 2], // 39
  [2, 2], // 40
  [3, 2], // 41
  [2, 3], // 42
  [3, 2], // 43
  [2, 3], // 44
  [3, 2], // 45
  [2, 3], // 46
  [3, 2], // 47
  [2, 3], // 48
  [3, 2], // 49
  [2, 3], // 50
  [3, 2], // 51
  [2, 3], // 52
  [3, 2], // 53
  [2, 3], // 54
  [3, 2], // 55
  [3, 3], // 56
  [3, 3], // 57
  [3, 3], // 58
  [3, 3], // 59
  [3, 3], // 60
];

/** Digit widths inferred from https://www.usmentalmath.org/events/competitions/Samples/DD.pdf */
export const DIVISION_PROFILES: readonly (readonly [number, number])[] = [
  [1, 1], // 1
  [1, 1], // 2
  [1, 1], // 3
  [1, 1], // 4
  [1, 1], // 5
  [1, 1], // 6
  [1, 1], // 7
  [1, 1], // 8
  [2, 1], // 9
  [2, 1], // 10
  [2, 1], // 11
  [2, 1], // 12
  [2, 1], // 13
  [2, 1], // 14
  [2, 1], // 15
  [3, 1], // 16
  [3, 1], // 17
  [3, 1], // 18
  [3, 1], // 19
  [3, 1], // 20
  [2, 2], // 21
  [2, 2], // 22
  [2, 2], // 23
  [2, 2], // 24
  [2, 2], // 25
  [2, 2], // 26
  [2, 2], // 27
  [2, 2], // 28
  [2, 2], // 29
  [2, 2], // 30
  [2, 2], // 31
  [2, 2], // 32
  [2, 2], // 33
  [2, 2], // 34
  [2, 2], // 35
  [2, 2], // 36
  [2, 2], // 37
  [2, 2], // 38
  [2, 2], // 39
  [2, 2], // 40
  [3, 2], // 41
  [2, 3], // 42
  [2, 3], // 43
  [3, 2], // 44
  [2, 3], // 45
  [3, 2], // 46
  [2, 3], // 47
  [3, 2], // 48
  [3, 2], // 49
  [2, 3], // 50
  [3, 2], // 51
  [2, 3], // 52
  [3, 2], // 53
  [2, 3], // 54
  [3, 2], // 55
  [3, 3], // 56
  [3, 3], // 57
  [3, 3], // 58
  [3, 3], // 59
  [3, 3], // 60
];
