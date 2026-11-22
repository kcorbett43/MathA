import { CONTENT_PACK_SCHEMA_VERSION, type ContentPack } from './types';

/** Unit 3 — Expected value (~70% new / 30% dice+urns review). */
export const packU3Ev: ContentPack = {
  meta: {
    id: 'u3-ev',
    version: 3,
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    moduleId: 'm1-foundations',
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
      'Expected value is the interview workhorse: define E[X] from the PMF, then lean on linearity so you do not expand every joint distribution. Review dice and urns keep classical counting warm.',
    definitions: [
      {
        term: 'E[X] (discrete)',
        body: 'E[X] = Σ x · P(X = x) over all values x that X can take.',
      },
      {
        term: 'Fair die mean',
        body: 'For a fair F-sided die on faces 1…F, E[X] = (F + 1) / 2.',
      },
      {
        term: 'Linearity',
        body: 'E[X + Y] = E[X] + E[Y] always (no independence required). Indicator form: E[# successes] = Σ P(trial i succeeds).',
      },
    ],
    examples: [
      {
        title: 'Fair d6',
        prompt: 'A fair six-sided die. What is E[X]?',
        hint: 'Average of 1…F equals (F + 1) / 2.',
        steps: [
          'E[X] = (1+2+3+4+5+6)/6 = 21/6 = 7/2.',
          'Or use (F + 1)/2 with F = 6 → 7/2.',
        ],
        answer: '7/2',
      },
      {
        title: 'Heads in n flips',
        prompt: 'Flip 8 fair coins. Let X be the number of heads. What is E[X]?',
        hint: 'Linearity: each coin contributes 1/2.',
        steps: [
          'Write X = I₁ + … + I₈ where Iⱼ = 1 if flip j is heads.',
          'E[Iⱼ] = 1/2, so E[X] = 8 × 1/2 = 4.',
        ],
        answer: '4',
      },
      {
        title: 'Two-point RV',
        prompt: 'X equals 2 with probability 1/3 and equals 5 otherwise. What is E[X]?',
        hint: 'E[X] = a·P(X=a) + b·P(X=b).',
        steps: [
          'P(X = 5) = 1 − 1/3 = 2/3.',
          'E[X] = 2·(1/3) + 5·(2/3) = (2 + 10)/3 = 12/3 = 4.',
        ],
        answer: '4',
      },
    ],
  },
  drill: {
    n: 12,
    newShare: 0.7,
    newTopicTags: ['ev'],
    // reviewTopicTags derived from prerequisites → dice + urns
  },
};
