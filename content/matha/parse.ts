import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import type { MathaManifest, MathaTree, ParsedMathaPackage } from './types';

/**
 * Unpack a `.matha` ZIP (Uint8Array) into manifest + tree + units + assets.
 * Does not validate semantics — call `validateParsedPackage` next.
 */
export function parseMathaZip(bytes: Uint8Array): ParsedMathaPackage {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch (e) {
    throw new Error(`Invalid .matha ZIP: ${e instanceof Error ? e.message : String(e)}`);
  }

  const normalized: Record<string, Uint8Array> = {};
  for (const [name, data] of Object.entries(files)) {
    const key = name.replace(/^\.\//, '').replace(/\\/g, '/');
    if (key.endsWith('/')) continue;
    normalized[key] = data;
  }

  const manifestRaw = normalized['manifest.json'];
  if (!manifestRaw) {
    throw new Error('Missing manifest.json in .matha package');
  }

  let manifest: MathaManifest;
  try {
    manifest = JSON.parse(strFromU8(manifestRaw)) as MathaManifest;
  } catch {
    throw new Error('manifest.json is not valid JSON');
  }

  let tree: MathaTree | null = null;
  if (normalized['tree.json']) {
    try {
      tree = JSON.parse(strFromU8(normalized['tree.json'])) as MathaTree;
    } catch {
      throw new Error('tree.json is not valid JSON');
    }
  }

  const units: Record<string, unknown> = {};
  const assets: Record<string, Uint8Array> = {};

  for (const [path, data] of Object.entries(normalized)) {
    if (path === 'manifest.json' || path === 'tree.json') continue;

    const unitMatch = /^units\/([^/]+)\/unit\.json$/.exec(path);
    if (unitMatch) {
      const unitId = unitMatch[1]!;
      try {
        units[unitId] = JSON.parse(strFromU8(data));
      } catch {
        throw new Error(`${path} is not valid JSON`);
      }
      continue;
    }

    // Assets: everything else under units/*/assets/ or assets/
    if (
      path.startsWith('assets/') ||
      /^units\/[^/]+\/assets\//.test(path) ||
      /\.(png|jpe?g|gif|webp|svg|mp3|m4a|wav|ogg|aac)$/i.test(path)
    ) {
      assets[path] = data;
    }
  }

  return { manifest, tree, units, assets };
}

/** Build a `.matha` ZIP from in-memory files (for tests / example builder). */
export function buildMathaZip(files: Record<string, string | Uint8Array>): Uint8Array {
  const encoded: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    encoded[path] = typeof content === 'string' ? strToU8(content) : content;
  }
  return zipSync(encoded);
}
