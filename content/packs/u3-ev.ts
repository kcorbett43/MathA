import { CONTENT_PACK_SCHEMA_VERSION, type ContentPack } from './types';

/** Unit 3 — Expected value (~70% new / 30% dice+urns review). */
export const packU3Ev: ContentPack = {
  meta: {
    id: 'u3-ev',
    version: 6,
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    title: 'Expected value',
    order: 3,
    blurb: 'E[X] definition, linearity, and indicators',
    links: {
      before: ['u2-urns'],
      after: [],
      prerequisites: ['u1-dice', 'u2-urns'],
    },
  },
  lesson: {
    intro:
      'Expected value is the interview workhorse: define $E[X]$ from the PMF, then lean on linearity so you do not expand every joint distribution. Review dice and urns keep classical counting warm.',
    definitions: [
      {
        term: 'E[X] (discrete)',
        body: 'For a discrete random variable $X$,\n\n$$E[X] = \\sum_x x \\cdot P(X = x)$$\n\nover all values $x$ that $X$ can take.',
      },
      {
        term: 'Fair die mean',
        body: 'For a fair $F$-sided die on faces $1\\ldots F$, $$E[X] = \\frac{F + 1}{2}.$$',
      },
      {
        term: 'Linearity',
        body: '$$E[X + Y] = E[X] + E[Y]$$ always (no independence required). Indicator form: $E[\\#\\text{ successes}] = \\sum_i P(\\text{trial } i \\text{ succeeds})$.',
      },
    ],
    examples: [
      {
        title: 'Fair d6',
        prompt: 'A fair six-sided die. What is $E[X]$?',
        hint: 'Average of $1\\ldots F$ equals $\\dfrac{F + 1}{2}$.',
        steps: [
          '$$E[X] = \\frac{1+2+3+4+5+6}{6} = \\frac{21}{6} = \\frac{7}{2}.$$',
          'Or use $\\dfrac{F + 1}{2}$ with $F = 6$ → $\\dfrac{7}{2}$.',
        ],
        answer: '7/2',
      },
      {
        title: 'Heads in n flips',
        prompt: 'Flip 8 fair coins. Let $X$ be the number of heads. What is $E[X]$?',
        hint: 'Linearity: each coin contributes $\\dfrac{1}{2}$.',
        steps: [
          'Write $X = I_1 + \\cdots + I_8$ where $I_j = 1$ if flip $j$ is heads.',
          '$E[I_j] = \\dfrac{1}{2}$, so $E[X] = 8 \\times \\dfrac{1}{2} = 4$.',
        ],
        answer: '4',
      },
      {
        title: 'Two-point RV',
        prompt:
          'X equals 2 with probability $\\dfrac{1}{3}$ and equals 5 otherwise. What is $E[X]$?',
        hint: '$E[X] = a\\cdot P(X=a) + b\\cdot P(X=b)$.',
        steps: [
          '$P(X = 5) = 1 - \\dfrac{1}{3} = \\dfrac{2}{3}$.',
          '$$E[X] = 2\\cdot\\frac{1}{3} + 5\\cdot\\frac{2}{3} = \\frac{2 + 10}{3} = 4.$$',
        ],
        answer: '4',
      },
    ],
  },
  cards: [
    {
      id: 'u3-ex-def',
      front: '$E[X]$ (discrete)',
      back: '$$E[X] = \\sum_x x \\cdot P(X = x)$$ over all values $x$ that $X$ can take.',
    },
    {
      id: 'u3-fair-die',
      front: 'Fair die mean',
      back: 'For a fair $F$-sided die on faces $1\\ldots F$, $$E[X] = \\dfrac{F + 1}{2}.$$',
    },
    {
      id: 'u3-linearity',
      front: 'Linearity',
      back: '$$E[X + Y] = E[X] + E[Y]$$ always (no independence required). Indicator form: $E[\\#\\text{ successes}] = \\sum_i P(\\text{trial } i \\text{ succeeds})$.',
    },
    {
      id: 'u3-indicator',
      front: 'Indicator $I_A$',
      back: '$I_A = 1$ if event $A$ occurs, else $0$. Then $E[I_A] = P(A)$.',
    },
    {
      id: 'u3-two-point',
      front: 'Two-point RV',
      back: 'If $X = a$ with probability $p$ and $X = b$ otherwise, $$E[X] = a\\cdot p + b\\cdot(1 - p).$$',
    },
  ],
  drill: {
    n: 12,
    newShare: 0.7,
    newTopicTags: ['ev'],
  },
};
