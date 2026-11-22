/**
 * Bundled example `.matha` packages for Import (web + native).
 * Metro treats `.matha` as an asset via metro.config.js.
 */
import { Asset } from 'expo-asset';

export type ExamplePackage = {
  id: string;
  title: string;
  module: number;
};

export const EXAMPLE_PACKAGES: ExamplePackage[] = [
  {
    id: 'biology',
    title: 'Biology — cell basics',
    module: require('../../assets/matha/biology.matha'),
  },
  {
    id: 'probability',
    title: 'Probability foundations',
    module: require('../../assets/matha/probability.matha'),
  },
  {
    id: 'vocabulary',
    title: 'Vocabulary GRE sample',
    module: require('../../assets/matha/vocabulary.matha'),
  },
];

export async function loadExamplePackageBytes(pkg: ExamplePackage): Promise<Uint8Array> {
  const asset = Asset.fromModule(pkg.module);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error(`Could not resolve asset for ${pkg.id}`);

  // Web: fetch the served asset URL. Native: read via expo-file-system File API.
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('blob:')) {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Failed to fetch ${pkg.id}: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  try {
    const { File } = await import('expo-file-system');
    return await new File(uri).bytes();
  } catch {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Failed to load ${pkg.id}`);
    return new Uint8Array(await res.arrayBuffer());
  }
}
