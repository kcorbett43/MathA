import type { ContentPack } from './types';
import { packU1Dice } from './u1-dice';
import { packU2Urns } from './u2-urns';
import { packU3Ev } from './u3-ev';

/** All shipped Learn packs (TS modules). Seeded into the content store on first launch. */
export const LEARN_PACKS: ContentPack[] = [packU1Dice, packU2Urns, packU3Ev];

export { packU1Dice, packU2Urns, packU3Ev };
