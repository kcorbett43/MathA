import type { LearnModule } from './types';

/**
 * Learn modules registry.
 * First module groups the v1 packs (Dice, Urns, EV) as units.
 * Add modules here and set each pack’s `meta.moduleId`.
 */
export const LEARN_MODULES: LearnModule[] = [
  {
    id: 'm1-foundations',
    title: 'Probability foundations',
    blurb: 'Dice counting, urns & conditionals, then expected value — with spaced review.',
    order: 1,
    unitIds: ['u1-dice', 'u2-urns', 'u3-ev'],
  },
].sort((a, b) => a.order - b.order);
