import { CONTENT_PACK_SCHEMA_VERSION, type ContentPack } from './types';

/** Unit 2 — Urns & conditional (~75% new / 25% dice review). */
export const packU2Urns: ContentPack = {
  meta: {
    id: 'u2-urns',
    version: 4,
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
    blocks: [
      {
        type: 'text',
        body: 'Urn problems reuse classical counting, but the sample space shrinks after each draw. Memorize the conditional notation and the recount habit.',
      },
      {
        type: 'card',
        id: 'u2-simple-draw',
        front: 'Simple draw',
        back: 'P(color) = (count of that color) / (total balls) when one ball is drawn at random.',
      },
      {
        type: 'card',
        id: 'u2-without-replacement',
        front: 'Without replacement',
        back: 'After a ball is removed, both the favorable count and the total shrink by one for the next draw.',
      },
      {
        type: 'card',
        id: 'u2-conditional',
        front: 'Conditional P(A | B)',
        back: 'Probability of A given that B already happened. For draws: restrict to the world where B occurred, then recount.',
      },
      {
        type: 'callout',
        body: '“Given the first is red” means start the second draw with one fewer red and one fewer total — do not average over both colors.',
      },
      {
        type: 'card',
        id: 'u2-second-given-first',
        front: 'P(2nd color | 1st color)',
        back: 'Remove the first ball from the bag, then P = (remaining of that color) / (new total).',
      },
      {
        type: 'card',
        id: 'u2-complement-cond',
        front: 'Complement after conditioning',
        back: 'Given B, P(Aᶜ | B) = 1 − P(A | B). Same restricted world — just swap favorable counts.',
      },
    ],
    examples: [
      {
        title: 'P(not blue)',
        prompt: 'A bag has 3 red, 4 green, and 5 blue balls. Draw one. What is P(not blue)?',
        hint: 'Favorable = everything except blue; total = all balls.',
        steps: [
          'Total = 3 + 4 + 5 = 12.',
          'Not blue = red + green = 7.',
          'P = 7/12.',
        ],
        answer: '7/12',
      },
      {
        title: 'P(2nd red | 1st red)',
        prompt:
          'A bag has 5 red and 3 blue. Draw two without replacement. Given the first is red, what is P(second is red)?',
        hint: 'After removing one red, how many red and total remain?',
        steps: [
          'After removing one red: 4 red and 3 blue remain (7 total).',
          'P(2nd red | 1st red) = 4/7.',
        ],
        answer: '4/7',
      },
      {
        title: 'Complement after conditioning',
        prompt:
          'Same bag (5 red, 3 blue). Given first is red, what is P(second is blue)?',
        hint: 'After one red is gone: recount blue over the new total.',
        steps: [
          'After one red removed: 4 red, 3 blue, total 7.',
          'P(2nd blue | 1st red) = 3/7.',
        ],
        answer: '3/7',
      },
    ],
  },
  drill: {
    n: 12,
    newShare: 0.75,
    newTopicTags: ['urns'],
    // reviewTopicTags derived from prerequisites → u1-dice.newTopicTags (dice)
  },
};
