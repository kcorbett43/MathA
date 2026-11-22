import type { CollectionId, LearnCollection } from './types';

/**
 * Learn collections registry — nested tree, unlimited depth.
 * Children are either nested collections or leaf unit packs.
 *
 * v1: one root collection with the three Quant packs as direct children.
 */
export const LEARN_COLLECTIONS: LearnCollection[] = [
  {
    id: 'c-foundations',
    title: 'Probability foundations',
    blurb: 'Dice counting, urns & conditionals, then expected value — with spaced review.',
    children: [
      { kind: 'pack', id: 'u1-dice' },
      { kind: 'pack', id: 'u2-urns' },
      { kind: 'pack', id: 'u3-ev' },
    ],
  },
];

/** Top-level collections shown on the Learn home screen. */
export const LEARN_ROOT_COLLECTION_IDS: CollectionId[] = ['c-foundations'];
