import { CONTENT_PACK_SCHEMA_VERSION, type ContentPack } from './types';

/** Unit 1 — Counting & dice (100% new). */
export const packU1Dice: ContentPack = {
  meta: {
    id: 'u1-dice',
    version: 6,
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    title: 'Counting & dice',
    order: 1,
    blurb: 'Equally likely outcomes and sample-space counting',
    links: {
      before: [],
      after: ['u2-urns'],
      prerequisites: [],
    },
  },
  lesson: {
    intro:
      'Interviewers use fair dice to check that you can size a sample space and count favorable outcomes without a calculator. This unit builds that reflex.',
    definitions: [
      {
        term: 'Outcome',
        body: 'One possible result of an experiment (e.g. die A shows 3 and die B shows 4).',
      },
      {
        term: 'Sample space Ω',
        body: 'The set of all equally likely outcomes. For two fair $F$-sided dice, $|\\Omega| = F \\times F$.',
      },
      {
        term: 'Event A',
        body: 'A subset of $\\Omega$ (e.g. “sum equals 7”).',
      },
      {
        term: 'Classical probability',
        body: 'When every outcome is equally likely,\n\n$$P(A) = \\frac{|A|}{|\\Omega|}.$$',
      },
    ],
    examples: [
      {
        title: '2d6 sum = 7',
        prompt: 'Two fair six-sided dice. What is $P(\\text{sum} = 7)$?',
        hint: 'Count ordered pairs $(a, b)$ with $a + b = 7$, then divide by $6^2$.',
        steps: [
          '$|\\Omega| = 6 \\times 6 = 36$ ordered pairs.',
          'Favorable: $(1,6)$, $(2,5)$, $(3,4)$, $(4,3)$, $(5,2)$, $(6,1)$ → 6 outcomes.',
          '$$P = \\frac{6}{36} = \\frac{1}{6}.$$',
        ],
        answer: '1/6',
      },
      {
        title: '2d8 sum = 9',
        prompt: 'Two fair eight-sided dice. What is $P(\\text{sum} = 9)$?',
        hint: 'Count ordered pairs with $a + b = 9$ (faces $1\\ldots 8$), divide by $64$.',
        steps: [
          '$|\\Omega| = 8 \\times 8 = 64$.',
          'Pairs with $a + b = 9$ and $1 \\le a,b \\le 8$: $(1,8)\\ldots(8,1)$ → 8 outcomes.',
          '$$P = \\frac{8}{64} = \\frac{1}{8}.$$',
        ],
        answer: '1/8',
      },
      {
        title: 'Mid-range check',
        prompt: 'Two fair 5-sided dice. What is $P(\\text{sum} = 6)$?',
        hint: 'Count pairs with $a + b = 6$ on faces $1\\ldots 5$, then divide by $25$.',
        steps: [
          '$|\\Omega| = 25$.',
          'Favorable: $(1,5)$, $(2,4)$, $(3,3)$, $(4,2)$, $(5,1)$ → 5.',
          '$$P = \\frac{5}{25} = \\frac{1}{5}.$$',
        ],
        answer: '1/5',
      },
    ],
  },
  cards: [
    {
      id: 'u1-outcome',
      front: 'Outcome',
      back: 'One possible result of an experiment (e.g. die A shows 3 and die B shows 4).',
    },
    {
      id: 'u1-sample-space',
      front: 'Sample space $\\Omega$',
      back: 'The set of all equally likely outcomes. For two fair $F$-sided dice, $|\\Omega| = F \\times F$.',
    },
    {
      id: 'u1-event',
      front: 'Event $A$',
      back: 'A subset of $\\Omega$ (e.g. “sum equals 7”).',
    },
    {
      id: 'u1-classical-prob',
      front: 'Classical probability',
      back: 'When every outcome is equally likely, $$P(A) = \\frac{|A|}{|\\Omega|}.$$',
    },
    {
      id: 'u1-two-dice-size',
      front: '$|\\Omega|$ for two fair $F$-sided dice',
      back: '$F \\times F$ ordered pairs (faces $1\\ldots F$ on each die).',
    },
    {
      id: 'u1-sum-count',
      front: 'Counting $P(\\text{sum} = s)$ on $2dF$',
      back: 'Count ordered pairs $(a, b)$ with $a + b = s$ and $1 \\le a,b \\le F$, then divide by $F^2$.',
    },
  ],
  drill: {
    n: 10,
    newShare: 1,
    newTopicTags: ['dice'],
  },
};
