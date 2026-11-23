import { CONTENT_PACK_SCHEMA_VERSION, type ContentPack } from './types';

/** Unit 2 — Urns & conditional (~75% new / 25% dice review). */
export const packU2Urns: ContentPack = {
  meta: {
    id: 'u2-urns',
    version: 6,
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    title: 'Urns & conditional',
    order: 2,
    blurb: 'Without replacement and P(2nd | 1st)',
    links: {
      before: ['u1-dice'],
      after: ['u3-ev'],
      prerequisites: ['u1-dice'],
    },
  },
  lesson: {
    intro:
      'Bags and draws without replacement are the classic way to probe conditional probability. You recount after each draw — then mix in a few dice counts so earlier skills stick.',
    definitions: [
      {
        term: 'Simple draw',
        body: '$P(\\text{color}) = \\dfrac{\\text{count of that color}}{\\text{total balls}}$ when one ball is drawn at random.',
      },
      {
        term: 'Without replacement',
        body: 'After a ball is removed, both the favorable count and the total shrink by one for the next draw.',
      },
      {
        term: 'Conditional P(A | B)',
        body: 'Probability of $A$ given that $B$ already happened:\n\n$$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}.$$\n\nFor draws: restrict to the world where $B$ occurred, then recount.',
      },
    ],
    examples: [
      {
        title: 'P(not blue)',
        prompt:
          'A bag has 3 red, 4 green, and 5 blue balls. Draw one. What is $P(\\text{not blue})$?',
        hint: 'Favorable = everything except blue; total = all balls.',
        steps: [
          'Total $= 3 + 4 + 5 = 12$.',
          'Not blue $=$ red + green $= 7$.',
          '$$P = \\frac{7}{12}.$$',
        ],
        answer: '7/12',
      },
      {
        title: 'P(2nd red | 1st red)',
        prompt:
          'A bag has 5 red and 3 blue. Draw two without replacement. Given the first is red, what is $P(\\text{second is red})$?',
        hint: 'After removing one red, how many red and total remain?',
        steps: [
          'After removing one red: 4 red and 3 blue remain (7 total).',
          '$$P(\\text{2nd red} \\mid \\text{1st red}) = \\frac{4}{7}.$$',
        ],
        answer: '4/7',
      },
      {
        title: 'Complement after conditioning',
        prompt:
          'Same bag (5 red, 3 blue). Given first is red, what is $P(\\text{second is blue})$?',
        hint: 'After one red is gone: recount blue over the new total.',
        steps: [
          'After one red removed: 4 red, 3 blue, total 7.',
          '$$P(\\text{2nd blue} \\mid \\text{1st red}) = \\frac{3}{7}.$$',
        ],
        answer: '3/7',
      },
    ],
  },
  cards: [
    {
      id: 'u2-simple-draw',
      front: 'Simple draw',
      back: '$P(\\text{color}) = \\dfrac{\\text{count of that color}}{\\text{total balls}}$ when one ball is drawn at random.',
    },
    {
      id: 'u2-without-replacement',
      front: 'Without replacement',
      back: 'After a ball is removed, both the favorable count and the total shrink by one for the next draw.',
    },
    {
      id: 'u2-conditional',
      front: 'Conditional $P(A \\mid B)$',
      back: 'Probability of $A$ given that $B$ already happened. For draws: restrict to the world where $B$ occurred, then recount. $$P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)}.$$',
    },
    {
      id: 'u2-second-given-first',
      front: '$P(\\text{2nd color} \\mid \\text{1st color})$',
      back: 'Remove the first ball from the bag, then $P = \\dfrac{\\text{remaining of that color}}{\\text{new total}}$.',
    },
    {
      id: 'u2-complement-cond',
      front: 'Complement after conditioning',
      back: 'Given $B$, $P(A^{c} \\mid B) = 1 - P(A \\mid B)$. Same restricted world — just swap favorable counts.',
    },
  ],
  drill: {
    n: 12,
    newShare: 0.75,
    newTopicTags: ['urns'],
  },
};
