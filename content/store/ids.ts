import type { PackageId } from './types';

/**
 * Progress and collision identity helpers.
 *
 * **Namespace rule:** authors should use package-prefixed ids for packages,
 * collections, units, questions, cards, and review sources
 * (e.g. `pkg.prob.u1-dice`, `pkg.prob.c-classical-fwd`). Shipped curriculum
 * uses stable short ids (`u1-dice`) owned by `matha.shipped.*`.
 *
 * **Store uniqueness:** unit and collection ids are globally unique keys in the
 * content store. Different packages must not claim the same unit/collection id
 * (install blocked — never silent overwrite).
 *
 * **Progress keys:** learner progress is keyed by the full triple
 * `(packageId, unitId, itemId)` where `itemId` is a card id or question id.
 * Unchanged triples keep progress across content updates; new item ids start fresh.
 */

export type ProgressItemKind = 'card' | 'question';

export function progressKey(
  packageId: PackageId,
  unitId: string,
  itemId: string,
): string {
  return `${packageId}\u0000${unitId}\u0000${itemId}`;
}

export function parseProgressKey(key: string): {
  packageId: string;
  unitId: string;
  itemId: string;
} | null {
  const parts = key.split('\u0000');
  if (parts.length !== 3) return null;
  return { packageId: parts[0]!, unitId: parts[1]!, itemId: parts[2]! };
}
