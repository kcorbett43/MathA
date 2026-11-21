import { randInt } from '@/lib/random';
import type { Question } from '@/lib/types';

type TemplateFn = () => Question;

function small(): number {
  return randInt(2, 9);
}

function addend(): number {
  // Mostly 1–40, occasional larger
  return Math.random() < 0.85 ? randInt(1, 40) : randInt(1, 99);
}

function tiny(): number {
  return randInt(1, 9);
}

function exactPair(): { dividend: number; divisor: number; quot: number } {
  const divisor = randInt(2, 9);
  const quot = randInt(2, 20);
  return { dividend: quot * divisor, divisor, quot };
}

/**
 * Weighted procedural stand-in for OpenQuant Arithmetic Pro bank.
 * Do not ship their JSON — generate from dominant templates.
 */
const TEMPLATES: { weight: number; make: TemplateFn }[] = [
  {
    // N * (N + N) — dominant
    weight: 28,
    make: () => {
      const s = small();
      const a = addend();
      const b = addend();
      return {
        prompt: `${s} × (${a} + ${b})`,
        answer: String(s * (a + b)),
      };
    },
  },
  {
    // (N + N) * N
    weight: 24,
    make: () => {
      const a = addend();
      const b = addend();
      const s = small();
      return {
        prompt: `(${a} + ${b}) × ${s}`,
        answer: String((a + b) * s),
      };
    },
  },
  {
    // (N + N) * (N - N)
    weight: 12,
    make: () => {
      const a = tiny();
      const b = tiny();
      const c = randInt(2, 12);
      const d = randInt(1, c);
      return {
        prompt: `(${a} + ${b}) × (${c} − ${d})`,
        answer: String((a + b) * (c - d)),
      };
    },
  },
  {
    // N + N * (N - N)
    weight: 6,
    make: () => {
      const a = addend();
      const s = small();
      const c = randInt(2, 15);
      const d = randInt(1, c);
      return {
        prompt: `${a} + ${s} × (${c} − ${d})`,
        answer: String(a + s * (c - d)),
      };
    },
  },
  {
    // N + N * N
    weight: 5,
    make: () => {
      const a = addend();
      const b = small();
      const c = tiny();
      return {
        prompt: `${a} + ${b} × ${c}`,
        answer: String(a + b * c),
      };
    },
  },
  {
    // N - (N + N) * (N + N) — often small/negative
    weight: 5,
    make: () => {
      const a = randInt(5, 40);
      const b = tiny();
      const c = tiny();
      const d = tiny();
      const e = tiny();
      return {
        prompt: `${a} − (${b} + ${c}) × (${d} + ${e})`,
        answer: String(a - (b + c) * (d + e)),
      };
    },
  },
  {
    // N / N + N - N — rare exact division
    weight: 5,
    make: () => {
      const { dividend, divisor, quot } = exactPair();
      const c = tiny();
      const d = tiny();
      return {
        prompt: `${dividend} ÷ ${divisor} + ${c} − ${d}`,
        answer: String(quot + c - d),
      };
    },
  },
  {
    // (N + N) * (N + N)
    weight: 3,
    make: () => {
      const a = tiny();
      const b = tiny();
      const c = tiny();
      const d = tiny();
      return {
        prompt: `(${a} + ${b}) × (${c} + ${d})`,
        answer: String((a + b) * (c + d)),
      };
    },
  },
  {
    // (N - N) * (N + N)
    weight: 3,
    make: () => {
      const a = randInt(5, 20);
      const b = randInt(1, a);
      const c = tiny();
      const d = tiny();
      return {
        prompt: `(${a} − ${b}) × (${c} + ${d})`,
        answer: String((a - b) * (c + d)),
      };
    },
  },
  {
    // N * (N - N)
    weight: 3,
    make: () => {
      const s = small();
      const a = randInt(5, 30);
      const b = randInt(1, a);
      return {
        prompt: `${s} × (${a} − ${b})`,
        answer: String(s * (a - b)),
      };
    },
  },
  {
    // (N + N) * (N + N) - N
    weight: 3,
    make: () => {
      const a = tiny();
      const b = tiny();
      const c = tiny();
      const d = tiny();
      const e = tiny();
      return {
        prompt: `(${a} + ${b}) × (${c} + ${d}) − ${e}`,
        answer: String((a + b) * (c + d) - e),
      };
    },
  },
  {
    // (N - N) * N + N
    weight: 3,
    make: () => {
      const a = randInt(5, 25);
      const b = randInt(1, a);
      const s = small();
      const c = tiny();
      return {
        prompt: `(${a} − ${b}) × ${s} + ${c}`,
        answer: String((a - b) * s + c),
      };
    },
  },
];

function weightedPick(): TemplateFn {
  const total = TEMPLATES.reduce((sum, t) => sum + t.weight, 0);
  let roll = randInt(1, total);
  for (const t of TEMPLATES) {
    roll -= t.weight;
    if (roll <= 0) return t.make;
  }
  return TEMPLATES[0].make;
}

export function generateArithmeticProQuestion(): Question {
  return weightedPick()();
}
