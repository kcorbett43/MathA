import { randInt, pick } from '@/lib/random';
import type { Question } from '@/lib/types';

type Op = '+' | '-' | '*' | '/';

/**
 * OpenQuant-like Arithmetic generator (procedural reimplementation).
 * Format: `a ∘ b = ?` with exact division and optional negative subtraction.
 */
export function generateArithmeticQuestion(): Question {
  const op = pick<Op>(['+', '/', '-', '*']);

  if (op === '+') {
    const a = randInt(2, 99);
    const b = randInt(2, 99);
    return {
      prompt: `${a} + ${b} = ?`,
      answer: String(a + b),
    };
  }

  if (op === '-') {
    const a = randInt(2, 99);
    const b = randInt(2, 99);
    return {
      prompt: `${a} − ${b} = ?`,
      answer: String(a - b),
    };
  }

  if (op === '*') {
    const small = randInt(2, 12);
    const large = randInt(2, 99);
    const [left, right] = Math.random() < 0.5 ? [small, large] : [large, small];
    return {
      prompt: `${left} × ${right} = ?`,
      answer: String(left * right),
    };
  }

  // Exact division: synthesize from quotient × divisor
  const quot = randInt(2, 99);
  const div = randInt(2, 12);
  const dividend = quot * div;
  return {
    prompt: `${dividend} ÷ ${div} = ?`,
    answer: String(quot),
  };
}
