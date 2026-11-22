import type { ContentPack } from './types';

import { packU1Dice } from './u1-dice';
import { packU2Urns } from './u2-urns';
import { packU3Ev } from './u3-ev';

export {
  CONTENT_PACK_SCHEMA_VERSION,
  type ContentPack,
  type GeneratorId,
  type PackDefinition,
  type PackDrill,
  type PackExample,
  type PackLesson,
  type PackMeta,
} from './types';

/** All Learn packs, sorted by `meta.order`. Add new units here. */
export const LEARN_PACKS: ContentPack[] = [packU1Dice, packU2Urns, packU3Ev].sort(
  (a, b) => a.meta.order - b.meta.order,
);

export function packById(id: string | undefined): ContentPack | undefined {
  if (!id) return undefined;
  return LEARN_PACKS.find((p) => p.meta.id === id);
}

export { packU1Dice, packU2Urns, packU3Ev };
