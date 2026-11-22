/**
 * Persist and resolve package assets (images/audio) for installed `.matha` packs.
 * Prefer on-disk files under Paths.document; fall back to data URIs (tests / web).
 */

export type AssetUriMap = Record<string, string>;

function mimeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  return 'application/octet-stream';
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function dataUri(path: string, bytes: Uint8Array): string {
  return `data:${mimeForPath(path)};base64,${bytesToBase64(bytes)}`;
}

function sanitizePackageId(packageId: string): string {
  return packageId.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Write package assets and return a map of package-root-relative path → URI.
 */
export async function persistPackageAssets(
  packageId: string,
  assets: Record<string, Uint8Array>,
): Promise<AssetUriMap> {
  const uris: AssetUriMap = {};
  if (Object.keys(assets).length === 0) return uris;

  try {
    const { Directory, File, Paths } = await import('expo-file-system');
    const root = new Directory(Paths.document, 'matha-assets', sanitizePackageId(packageId));
    if (!root.exists) {
      root.create({ intermediates: true, idempotent: true });
    }

    for (const [rel, bytes] of Object.entries(assets)) {
      const normalized = rel.replace(/^\.\//, '').replace(/\\/g, '/');
      const parts = normalized.split('/').filter(Boolean);
      if (parts.length === 0) continue;

      // Ensure parent directories
      if (parts.length > 1) {
        let dir = root;
        for (const segment of parts.slice(0, -1)) {
          dir = new Directory(dir, segment);
          if (!dir.exists) {
            dir.create({ intermediates: true, idempotent: true });
          }
        }
        const file = new File(dir, parts[parts.length - 1]!);
        if (!file.exists) file.create();
        await file.write(bytes);
        uris[normalized] = file.uri;
      } else {
        const file = new File(root, parts[0]!);
        if (!file.exists) file.create();
        await file.write(bytes);
        uris[normalized] = file.uri;
      }
    }
    return uris;
  } catch {
    // Node tests / environments without native FS
    for (const [rel, bytes] of Object.entries(assets)) {
      const normalized = rel.replace(/^\.\//, '').replace(/\\/g, '/');
      uris[normalized] = dataUri(normalized, bytes);
    }
    return uris;
  }
}

/** Resolve a package-root-relative asset path using the installed package map. */
export function resolveAssetUri(
  assetUris: AssetUriMap | undefined,
  ref: string,
): string | undefined {
  if (!ref || ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:')) {
    return ref || undefined;
  }
  if (!assetUris) return undefined;
  const normalized = ref.replace(/^\.\//, '').replace(/\\/g, '/');
  return assetUris[normalized];
}
