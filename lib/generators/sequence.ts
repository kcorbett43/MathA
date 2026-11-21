import { randInt, pick } from '@/lib/random';
import type { Question } from '@/lib/types';

type Family = 'arithmetic' | 'geometric' | 'quadratic' | 'special';
type SpecialKind = 'squares' | 'cubes' | 'triangular';

function buildArithmetic(): number[] {
  const a0 = randInt(5, 22);
  const d = randInt(2, 22);
  return [0, 1, 2, 3, 4].map((k) => a0 + k * d);
}

function buildGeometric(): number[] {
  const a0 = randInt(5, 22);
  const r = randInt(2, 9);
  return [0, 1, 2, 3, 4].map((k) => a0 * r ** k);
}

function buildQuadratic(): number[] {
  const A = randInt(-8, 8);
  const B = randInt(-8, 8);
  const C = randInt(-8, 8);
  return [1, 2, 3, 4, 5].map((n) => A * n * n + B * n + C);
}

function buildSpecial(): number[] {
  const kind = pick<SpecialKind>(['squares', 'cubes', 'triangular']);
  const j = randInt(1, 5);
  return [0, 1, 2, 3, 4].map((k) => {
    const n = j + k;
    if (kind === 'squares') return n * n;
    if (kind === 'cubes') return n * n * n;
    return (n * (n + 1)) / 2;
  });
}

/**
 * OpenQuant-like Sequence generator.
 * Five terms shown as `a, b, c, d, ?` — blank always last.
 */
export function generateSequenceQuestion(): Question {
  const family = pick<Family>(['arithmetic', 'geometric', 'quadratic', 'special']);

  let terms: number[];
  switch (family) {
    case 'arithmetic':
      terms = buildArithmetic();
      break;
    case 'geometric':
      terms = buildGeometric();
      break;
    case 'quadratic':
      terms = buildQuadratic();
      break;
    default:
      terms = buildSpecial();
  }

  if (Math.random() < 0.5) {
    terms = [...terms].reverse();
  }

  const answer = terms[4];
  const shown = terms.slice(0, 4).join(', ');
  return {
    prompt: `${shown}, ?`,
    answer: String(answer),
  };
}
