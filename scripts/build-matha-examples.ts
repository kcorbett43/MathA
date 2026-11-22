/**
 * Pack example folders under content/matha/examples/* into .matha ZIPs
 * written to content/matha/fixtures/.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { zipSync } from 'fflate';

const ROOT = join(__dirname, '..');
const EXAMPLES = join(ROOT, 'content/matha/examples');
const OUT = join(ROOT, 'content/matha/fixtures');
const ASSETS = join(ROOT, 'assets/matha');

function collectFiles(dir: string, base = dir): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {};
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      Object.assign(out, collectFiles(full, base));
    } else {
      const rel = relative(base, full).replace(/\\/g, '/');
      out[rel] = new Uint8Array(readFileSync(full));
    }
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
mkdirSync(ASSETS, { recursive: true });

for (const name of readdirSync(EXAMPLES)) {
  const dir = join(EXAMPLES, name);
  if (!statSync(dir).isDirectory()) continue;
  const files = collectFiles(dir);
  const zipped = zipSync(files);
  const outPath = join(OUT, `${name}.matha`);
  writeFileSync(outPath, zipped);
  writeFileSync(join(ASSETS, `${name}.matha`), zipped);
  console.log(`Wrote ${outPath} (${Object.keys(files).length} files, ${zipped.length} bytes)`);
}
