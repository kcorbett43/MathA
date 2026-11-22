/**
 * Acceptance tests for .matha import / reimport (spec §14).
 * Run: npx tsx scripts/test-matha-import.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expandReviewCards } from '../content/packs/normalize';
import { buildMathaZip, parseMathaZip } from '../content/matha/parse';
import { validateParsedPackage, hasErrors } from '../content/matha/validate';
import { importMathaBytes, prepareImport, installPackage } from '../content/matha/install';
import { gradeAuthoredAnswer } from '../content/matha/grade';
import { buildShippedSnapshot } from '../content/store/seed';
import type { ProgressStoreSnapshot } from '../content/store/types';

const ROOT = join(__dirname, '..');
const FIXTURES = join(ROOT, 'content/matha/fixtures');

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, `${name}.matha`)));
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  // Ensure fixtures exist
  const { execSync } = await import('node:child_process');
  execSync('npx tsx scripts/build-matha-examples.ts', { cwd: ROOT, stdio: 'inherit' });

  section('Three example packages install cleanly');
  let snapshot = buildShippedSnapshot('2026-01-01T00:00:00.000Z');

  for (const name of ['probability', 'biology', 'vocabulary'] as const) {
    const bytes = loadFixture(name);
    const result = importMathaBytes(bytes, snapshot, { parentCollectionId: null });
    assert.equal(result.status, 'installed', `${name}: expected installed, got ${result.status}`);
    assert.ok(result.preview.canInstall, `${name}: canInstall`);
    assert.ok(!hasErrors(result.preview.issues), `${name}: unexpected validation errors`);
    if (result.status !== 'installed') throw new Error('unreachable');
    snapshot = result.snapshot;
    console.log(`OK install ${name} → ${result.preview.packageId}`);
  }

  // Exercise model specifics
  const vocabUnit = snapshot.units['pkg.vocab.u1-gre'];
  assert.ok(vocabUnit, 'vocabulary unit present');
  assert.ok(!vocabUnit.lesson && !vocabUnit.practice, 'vocabulary is review-forward');
  const cards = expandReviewCards(vocabUnit);
  assert.equal(cards.length, 4, 'basic + 2 reversible + 1 cloze');
  assert.ok(cards.some((c) => c.front.includes('[…]') || c.front.includes('[')));

  const bioUnit = snapshot.units['pkg.bio.u1-cell'];
  assert.ok(bioUnit?.practice?.questions?.some((q) => q.answerType === 'manual'));
  const textQ = bioUnit!.practice!.questions!.find((q) => q.id === 'pkg.bio.q-mito')!;
  assert.equal(
    gradeAuthoredAnswer('text', 'Mitochondria', textQ.answer, textQ.aliases).correct,
    true,
  );
  assert.equal(gradeAuthoredAnswer('manual', 'anything', undefined).kind, 'manual');

  const probUnit = snapshot.units['pkg.prob.u1-dice'];
  assert.ok(probUnit?.lesson && probUnit.practice && probUnit.review);
  assert.ok(probUnit.practice!.generators?.includes('dice'));

  section('Reimport: same revision + same content → no-op');
  {
    const bytes = loadFixture('probability');
    const result = importMathaBytes(bytes, snapshot, { parentCollectionId: null });
    assert.equal(result.status, 'noop');
    console.log('OK no-op');
  }

  section('Reimport: bumped revision updates content; progress kept for unchanged ids');
  {
    const parsed = parseMathaZip(loadFixture('probability'));
    const unit = parsed.units['pkg.prob.u1-dice'] as Record<string, unknown>;
    const meta = unit.meta as Record<string, unknown>;
    meta.version = 2;
    (unit.lesson as { intro: string }).intro = 'Updated intro for revision 2.';
    parsed.manifest.revision = 2;

    const files: Record<string, string> = {
      'manifest.json': JSON.stringify(parsed.manifest, null, 2),
      'tree.json': JSON.stringify(parsed.tree, null, 2),
      'units/pkg.prob.u1-dice/unit.json': JSON.stringify(unit, null, 2),
    };
    const bytes = buildMathaZip(files);

    const progress: ProgressStoreSnapshot = {
      schemaVersion: 1,
      cards: [
        {
          unitId: 'pkg.prob.u1-dice',
          cardId: 'pkg.prob.c-classical-fwd',
          data: { ease: 2.5 },
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      questions: [],
    };

    const result = importMathaBytes(bytes, snapshot, null, progress);
    assert.equal(result.status, 'installed');
    if (result.status === 'installed') {
      assert.ok(result.preservedProgressIds.includes('pkg.prob.c-classical-fwd'));
      assert.equal(
        result.snapshot.units['pkg.prob.u1-dice']?.lesson?.intro,
        'Updated intro for revision 2.',
      );
      assert.equal(result.snapshot.packages['pkg.prob.foundations']?.revision, 2);
      snapshot = result.snapshot;
    }
    console.log('OK revision bump preserves progress ids');
  }

  section('New id when meaning changes; deleted → inactive');
  {
    const parsed = parseMathaZip(loadFixture('probability'));
    parsed.manifest.revision = 3;
    const unit = parsed.units['pkg.prob.u1-dice'] as {
      review: {
        sources: Array<{
          id: string;
          kind: string;
          front?: string;
          back?: string;
          cards: Array<{ id: string; direction?: string }>;
        }>;
      };
      meta: { version: number };
    };
    unit.meta.version = 3;
    // Replace classical card with new id (meaning change)
    unit.review.sources = [
      {
        id: 'pkg.prob.src-classical-v2',
        kind: 'basic',
        front: 'Classical probability (restated)',
        back: 'P = favorable / total',
        cards: [{ id: 'pkg.prob.c-classical-v2' }],
      },
    ];
    const bytes = buildMathaZip({
      'manifest.json': JSON.stringify(parsed.manifest),
      'tree.json': JSON.stringify(parsed.tree),
      'units/pkg.prob.u1-dice/unit.json': JSON.stringify(unit),
    });
    const { validated, preview } = prepareImport(bytes, snapshot);
    assert.ok(preview.canInstall);
    const installed = installPackage(snapshot, validated, preview, null);
    assert.equal(installed.status, 'installed');
    if (installed.status === 'installed') {
      snapshot = installed.snapshot;
      // Old card id is gone from active review; unit still active
      const expanded = expandReviewCards(snapshot.units['pkg.prob.u1-dice']!);
      assert.ok(expanded.every((c) => c.id !== 'pkg.prob.c-classical-fwd'));
      assert.ok(expanded.some((c) => c.id === 'pkg.prob.c-classical-v2'));
    }
    console.log('OK meaning-change uses new card ids');
  }

  section('Deleted unit → inactive; history kept');
  {
    // Import a package revision that drops the unit — use empty replacement package
    // Simulate by installing a vocab-like update that removes bio unit from its package
    // Mark bio unit inactive via a new biology revision with different unit id only
    const parsed = parseMathaZip(loadFixture('biology'));
    parsed.manifest.revision = 2;
    // Remove old unit from package payload; add a tiny replacement unit
    delete parsed.units['pkg.bio.u1-cell'];
    parsed.units['pkg.bio.u2-dna'] = {
      meta: {
        id: 'pkg.bio.u2-dna',
        version: 1,
        title: 'DNA basics',
        order: 1,
        blurb: 'Replacement unit',
      },
      review: {
        sources: [
          {
            id: 'pkg.bio.src-dna',
            kind: 'basic',
            front: 'DNA',
            back: 'Deoxyribonucleic acid',
            cards: [{ id: 'pkg.bio.c-dna' }],
          },
        ],
      },
    };
    parsed.tree = {
      roots: ['pkg.bio.c-root'],
      collections: [
        {
          id: 'pkg.bio.c-root',
          title: 'Biology (imported)',
          children: [{ kind: 'unit', id: 'pkg.bio.u2-dna' }],
        },
      ],
    };
    const bytes = buildMathaZip({
      'manifest.json': JSON.stringify(parsed.manifest),
      'tree.json': JSON.stringify(parsed.tree),
      'units/pkg.bio.u2-dna/unit.json': JSON.stringify(parsed.units['pkg.bio.u2-dna']),
    });
    const result = importMathaBytes(bytes, snapshot, null);
    assert.equal(result.status, 'installed');
    if (result.status === 'installed') {
      snapshot = result.snapshot;
      assert.equal(snapshot.units['pkg.bio.u1-cell']?.active, false);
      assert.equal(snapshot.units['pkg.bio.u2-dna']?.active, true);
      // History kept
      assert.ok(snapshot.units['pkg.bio.u1-cell']?.meta.title);
    }
    console.log('OK deleted unit marked inactive');
  }

  section('Placement preserved on update');
  {
    const place = snapshot.placements.find((p) => p.packageId === 'pkg.vocab.gre');
    assert.ok(place, 'vocab placement exists');
    const before = { ...place };
    const parsed = parseMathaZip(loadFixture('vocabulary'));
    parsed.manifest.revision = 2;
    const unit = parsed.units['pkg.vocab.u1-gre'] as { meta: { version: number; blurb: string } };
    unit.meta.version = 2;
    unit.meta.blurb = 'Updated blurb';
    const bytes = buildMathaZip({
      'manifest.json': JSON.stringify(parsed.manifest),
      'tree.json': JSON.stringify(parsed.tree),
      'units/pkg.vocab.u1-gre/unit.json': JSON.stringify(unit),
    });
    const result = importMathaBytes(bytes, snapshot, { parentCollectionId: 'should-ignore' });
    assert.equal(result.status, 'installed');
    if (result.status === 'installed') {
      snapshot = result.snapshot;
      const after = snapshot.placements.find((p) => p.packageId === 'pkg.vocab.gre');
      assert.ok(after);
      assert.equal(after!.parentCollectionId, before.parentCollectionId);
      assert.equal(after!.rootId, before.rootId);
    }
    console.log('OK placement preserved');
  }

  section('Validation failures never partial-install or silent discard');
  {
    const bad = buildMathaZip({
      'manifest.json': JSON.stringify({
        packageId: 'pkg.bad',
        revision: 1,
        formatVersion: 1,
        scope: 'unit',
      }),
      'units/pkg.bad.u1/unit.json': JSON.stringify({
        meta: { id: 'pkg.bad.u1', version: 1, title: 'Empty' },
        // no activities
      }),
    });
    const beforeKeys = Object.keys(snapshot.units).sort().join(',');
    const result = importMathaBytes(bad, snapshot, null);
    assert.equal(result.status, 'blocked');
    assert.ok(result.preview.issues.some((i) => i.code === 'unit.empty'));
    assert.equal(Object.keys(snapshot.units).sort().join(','), beforeKeys);
    console.log('OK empty unit blocked; store unchanged');
  }

  {
    const badGen = buildMathaZip({
      'manifest.json': JSON.stringify({
        packageId: 'pkg.badgen',
        revision: 1,
        formatVersion: 1,
        scope: 'unit',
      }),
      'units/pkg.badgen.u1/unit.json': JSON.stringify({
        meta: { id: 'pkg.badgen.u1', version: 1, title: 'Bad gen' },
        practice: {
          sessionSize: 5,
          mix: { authored: 0, generated: 1 },
          generators: ['not-a-real-generator'],
        },
      }),
    });
    const result = importMathaBytes(badGen, snapshot, null);
    assert.equal(result.status, 'blocked');
    assert.ok(result.preview.issues.some((i) => i.code === 'practice.generator.unknown'));
    console.log('OK unknown generator hard-fails (no silent discard)');
  }

  {
    // Same revision with changed content → error
    const parsed = parseMathaZip(loadFixture('vocabulary'));
    // vocab already at revision 2 in snapshot
    parsed.manifest.revision = 2;
    const unit = parsed.units['pkg.vocab.u1-gre'] as { meta: { blurb: string } };
    unit.meta.blurb = 'sneaky change without bump';
    const bytes = buildMathaZip({
      'manifest.json': JSON.stringify(parsed.manifest),
      'tree.json': JSON.stringify(parsed.tree),
      'units/pkg.vocab.u1-gre/unit.json': JSON.stringify(unit),
    });
    const result = importMathaBytes(bytes, snapshot, null);
    assert.equal(result.status, 'blocked');
    assert.ok(result.preview.issues.some((i) => i.code === 'revision.contentChanged'));
    console.log('OK same revision + changed content blocked');
  }

  // Collision across packages
  {
    const collision = buildMathaZip({
      'manifest.json': JSON.stringify({
        packageId: 'pkg.other',
        revision: 1,
        formatVersion: 1,
        scope: 'unit',
      }),
      'units/pkg.vocab.u1-gre/unit.json': JSON.stringify({
        meta: { id: 'pkg.vocab.u1-gre', version: 1, title: 'Steal id' },
        review: {
          sources: [
            {
              id: 'x',
              kind: 'basic',
              front: 'a',
              back: 'b',
              cards: [{ id: 'y' }],
            },
          ],
        },
      }),
    });
    // Note: folder id matches meta.id
    const result = importMathaBytes(collision, snapshot, null);
    assert.equal(result.status, 'blocked');
    assert.ok(result.preview.issues.some((i) => i.code === 'id.collision'));
    console.log('OK id collision blocked');
  }

  section('Shipped packs still in store');
  assert.ok(snapshot.units['u1-dice']?.active);
  assert.ok(snapshot.collections['c-foundations']?.active);
  console.log('OK shipped curriculum present');

  console.log('\nAll .matha import acceptance tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
