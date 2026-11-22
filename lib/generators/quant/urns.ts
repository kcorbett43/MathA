import { formatFraction } from '@/lib/fraction';
import { pick, randInt } from '@/lib/random';
import type { QuantQuestion } from '@/lib/quantTypes';

type UrnVariant = 'cond_second_red' | 'simple_not_color' | 'simple_color';

/**
 * Urn / bag drills — mostly conditional without replacement.
 * MathA-authored wording; conditional schema inspired by Unbluffable qe_F001 / qe_F005.
 */
export function generateUrnQuestion(): QuantQuestion {
  const variant = pick<UrnVariant>([
    'cond_second_red',
    'cond_second_red',
    'cond_second_red',
    'simple_not_color',
    'simple_color',
  ]);

  if (variant === 'cond_second_red') {
    const red = randInt(3, 14);
    const blue = randInt(2, 12);
    // P(2nd red | 1st red) = (red - 1) / (red + blue - 1)
    return {
      skillId: 'urns',
      prompt: `A bag holds ${red} red and ${blue} blue balls. You draw two without replacement. Given the first ball is red, what is the probability the second is also red?`,
      answer: formatFraction(red - 1, red + blue - 1),
      hint: 'After removing one red, how many red and total remain?',
    };
  }

  const red = randInt(2, 10);
  const green = randInt(2, 10);
  const blue = randInt(2, 10);
  const total = red + green + blue;

  if (variant === 'simple_not_color') {
    return {
      skillId: 'urns',
      prompt: `A bag holds ${red} red, ${green} green, and ${blue} blue balls. You draw one at random. What is the probability it is not blue?`,
      answer: formatFraction(red + green, total),
      hint: 'Favorable = everything except blue.',
    };
  }

  const color = pick(['red', 'green', 'blue'] as const);
  const favorable = color === 'red' ? red : color === 'green' ? green : blue;
  return {
    skillId: 'urns',
    prompt: `A bag holds ${red} red, ${green} green, and ${blue} blue balls. You draw one at random. What is the probability it is ${color}?`,
    answer: formatFraction(favorable, total),
    hint: 'Favorable count over total balls.',
  };
}
