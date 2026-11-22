import { formatFraction } from '@/lib/fraction';
import { pick, randInt } from '@/lib/random';
import type { QuantQuestion } from '@/lib/quantTypes';

type EvVariant = 'fair_die' | 'coin_heads' | 'indicator_trials' | 'two_value';

/**
 * Simple expected-value drills: fair die mean, linearity / indicators, two-point RVs.
 * MathA-authored (Jane Street ♣ topic outline only — no puzzle text).
 */
export function generateEvQuestion(): QuantQuestion {
  const variant = pick<EvVariant>([
    'fair_die',
    'coin_heads',
    'indicator_trials',
    'two_value',
  ]);

  if (variant === 'fair_die') {
    const faces = pick([4, 6, 8, 10, 12]);
    // E[X] = (1+2+...+F)/F = (F+1)/2
    return {
      skillId: 'ev',
      prompt: `A fair ${faces}-sided die shows faces 1 through ${faces}. What is E[X], the expected face value?`,
      answer: formatFraction(faces + 1, 2),
      hint: 'Average of 1…F equals (F + 1) / 2.',
    };
  }

  if (variant === 'coin_heads') {
    const n = randInt(2, 12);
    // E[# heads] = n/2
    return {
      skillId: 'ev',
      prompt: `You flip ${n} fair coins. Let X be the number of heads. What is E[X]?`,
      answer: formatFraction(n, 2),
      hint: 'Linearity: each coin contributes 1/2.',
    };
  }

  if (variant === 'indicator_trials') {
    const n = randInt(3, 10);
    const success = randInt(1, 4);
    const trials = randInt(success + 1, 8);
    // Each trial succeeds with p = success/trials; E[count] = n * p
    return {
      skillId: 'ev',
      prompt: `You run ${n} independent trials. Each succeeds with probability ${success}/${trials}. Let X be the number of successes. What is E[X]?`,
      answer: formatFraction(n * success, trials),
      hint: 'E[X] = n × p by linearity of indicators.',
    };
  }

  // Two-point RV: P(X=a)=p/q, else b
  const a = randInt(1, 6);
  let b = randInt(1, 10);
  while (b === a) b = randInt(1, 10);
  const pNum = randInt(1, 4);
  const pDen = randInt(pNum + 1, 8);
  // E[X] = a*(pNum/pDen) + b*(1 - pNum/pDen) = (a*pNum + b*(pDen-pNum)) / pDen
  const num = a * pNum + b * (pDen - pNum);
  return {
    skillId: 'ev',
    prompt: `A random variable X equals ${a} with probability ${pNum}/${pDen} and equals ${b} otherwise. What is E[X]?`,
    answer: formatFraction(num, pDen),
    hint: 'E[X] = a·P(X=a) + b·P(X=b).',
  };
}
