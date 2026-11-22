import { CONTENT_PACK_SCHEMA_VERSION, type ContentPack } from './types';

/** Unit 1 — Counting & dice (100% new). */
export const packU1Dice: ContentPack = {
  meta: {
    id: 'u1-dice',
    version: 4,
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
    blocks: [
      {
        type: 'text',
        body: 'Start with the language of equally likely outcomes. The flash cards below are the definitions you will reuse in every later unit.',
      },
      {
        type: 'card',
        id: 'u1-outcome',
        front: 'Outcome',
        back: 'One possible result of an experiment (e.g. die A shows 3 and die B shows 4).',
      },
      {
        type: 'card',
        id: 'u1-sample-space',
        front: 'Sample space Ω',
        back: 'The set of all equally likely outcomes. For two fair F-sided dice, |Ω| = F × F.',
      },
      {
        type: 'card',
        id: 'u1-event',
        front: 'Event A',
        back: 'A subset of Ω (e.g. “sum equals 7”).',
      },
      {
        type: 'card',
        id: 'u1-classical-prob',
        front: 'Classical probability',
        back: 'When every outcome is equally likely, P(A) = |A| / |Ω|.',
      },
      {
        type: 'callout',
        body: 'Always fix ordered pairs (or ordered n-tuples) when dice are distinguishable. “Sum = 7 on 2d6” is six ordered pairs out of 36, not three unordered pairs.',
      },
      {
        type: 'card',
        id: 'u1-two-dice-size',
        front: '|Ω| for two fair F-sided dice',
        back: 'F × F ordered pairs (faces 1…F on each die).',
      },
      {
        type: 'card',
        id: 'u1-sum-count',
        front: 'Counting P(sum = s) on 2dF',
        back: 'Count ordered pairs (a, b) with a + b = s and 1 ≤ a,b ≤ F, then divide by F².',
      },
    ],
    examples: [
      {
        title: '2d6 sum = 7',
        prompt: 'Two fair six-sided dice. What is P(sum = 7)?',
        hint: 'Count ordered pairs (a, b) with a + b = 7, then divide by 6².',
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
        hint: 'Count ordered pairs with a + b = 9 (faces 1…8), divide by 64.',
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
        hint: 'Count pairs with a + b = 6 on faces 1…5, then divide by 25.',
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
    // No priors — review pool empty (policy standard still → 100% new)
  },
};
