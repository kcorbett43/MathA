import { getRuntimeSnapshot } from '@/content/store';
import type { AssetUriMap } from '@/content/store/assets';
import type { ContentPack } from '@/content/packs/types';

/** Asset URI map for a unit's owning package (imported packs). */
export function assetUrisForPack(pack: ContentPack | undefined): AssetUriMap | undefined {
  if (!pack?.meta.packageId) return undefined;
  return getRuntimeSnapshot().packages[pack.meta.packageId]?.assetUris;
}
