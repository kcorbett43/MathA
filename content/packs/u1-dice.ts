import { CONTENT_PACK_SCHEMA_VERSION, type ContentPack } from './types';

/** Unit 1 — Counting & dice (100% new). */
export const packU1Dice: ContentPack = {
  meta: {
    id: 'u1-dice',
    version: 1,
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    title: 'Counting & dice',
    order: 1,
    blurb: 'Equally likely outcomes and sample-space counting',
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
        body: 'The set of all equally likely outcomes. For two fair F-sided dice, |Ω| = F × F.',
      },
      {
        term: 'Event A',
        body: 'A subset of Ω (e.g. “sum equals 7”).',
      },
      {
        term: 'Classical probability',
        body: 'When every outcome is equally likely, P(A) = |A| / |Ω|.',
      },
    ],
    examples: [
      {
        title: '2d6 sum = 7',
        prompt: 'Two fair six-sided dice. What is P(sum = 7)?',
        steps: [
          '|Ω| = 6 × 6 = 36 ordered pairs.',
          'Favorable: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) → 6 outcomes.',
          'P = 6/36 = 1/6.',
        ],
        answer: '1/6',
      },
      {
        title: '2d8 sum = 9',
        prompt: 'Two fair eight-sided dice. What is P(sum = 9)?',
        steps: [
          '|Ω| = 8 × 8 = 64.',
          'Pairs with a + b = 9 and 1 ≤ a,b ≤ 8: (1,8)…(8,1) → 8 outcomes.',
          'P = 8/64 = 1/8.',
        ],
        answer: '1/8',
      },
      {
        title: 'Mid-range check',
        prompt: 'Two fair 5-sided dice. What is P(sum = 6)?',
        steps: [
          '|Ω| = 25.',
          'Favorable: (1,5), (2,4), (3,3), (4,2), (5,1) → 5.',
          'P = 5/25 = 1/5.',
        ],
        answer: '1/5',
      },
    ],
  },
  drill: {
    n: 10,
    newShare: 1,
    newTopicTags: ['dice'],
    reviewTopicTags: [],
  },
};
