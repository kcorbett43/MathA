import { formatFraction } from '@/lib/fraction';
import { randInt } from '@/lib/random';
import type { QuantQuestion } from '@/lib/quantTypes';

/**
 * Two fair dice with faces 1..F; P(sum = S).
 * MathA-authored wording; formula matches classic counting (seed schema: Unbluffable qe_F004).
 */
export function generateDiceQuestion(): QuantQuestion {
  const faces = randInt(4, 12);
  const minSum = 2;
  const maxSum = 2 * faces;
  // Prefer attainable mid-range sums so answers aren't 0 or 1 often
  const sum = randInt(minSum + 1, maxSum - 1);

  let favorable = 0;
  for (let a = 1; a <= faces; a++) {
    const b = sum - a;
    if (b >= 1 && b <= faces) favorable += 1;
  }
  const total = faces * faces;

  return {
    skillId: 'dice',
    prompt: `Two fair dice each show 1 through ${faces}. What is the probability their sum is exactly ${sum}?`,
    answer: formatFraction(favorable, total),
    hint: 'Count ordered pairs (a, b) with a + b = target, then divide by faces².',
  };
}
