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
import { buildPracticeSequence } from '../lib/learnDrill';
import { progressKey } from '../content/store/ids';
import {
  buildShippedSnapshot,
  shippedPackageRevision,
  syncShippedPackage,
  SHIPPED_PACKAGE_ID,
} from '../content/store/seed';
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
  assert.equal(probUnit.practice!.generatorNewShare, 1);

  // Manual questions appear in practice sessions
  const bioSeq = buildPracticeSequence(bioUnit!);
  assert.ok(
    bioSeq.some((s) => s.kind === 'authored' && s.question.answerType === 'manual'),
    'manual questions included in session sequence',
  );
  console.log('OK manuals included in practice sequence');

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
          packageId: 'pkg.prob.foundations',
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
      const key = progressKey(
        'pkg.prob.foundations',
        'pkg.prob.u1-dice',
        'pkg.prob.c-classical-fwd',
      );
      assert.ok(result.preservedProgressIds.includes(key));
      assert.equal(
        result.snapshot.units['pkg.prob.u1-dice']?.lesson?.intro,
        'Updated intro for revision 2.',
      );
      assert.equal(result.snapshot.packages['pkg.prob.foundations']?.revision, 2);
      snapshot = result.snapshot;
    }
    console.log('OK revision bump preserves progress triples');
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

  section('Deleted unit → inactive; history kept; return same id reactivates');
  {
    const parsed = parseMathaZip(loadFixture('biology'));
    parsed.manifest.revision = 2;
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
      assert.ok(snapshot.units['pkg.bio.u1-cell']?.meta.title);
    }
    console.log('OK deleted unit marked inactive');

    // Return original unit id in revision 3 → reactivate
    const revive = parseMathaZip(loadFixture('biology'));
    revive.manifest.revision = 3;
    const reviveBytes = buildMathaZip({
      'manifest.json': JSON.stringify(revive.manifest),
      'tree.json': JSON.stringify(revive.tree),
      'units/pkg.bio.u1-cell/unit.json': JSON.stringify(revive.units['pkg.bio.u1-cell']),
    });
    const revived = importMathaBytes(reviveBytes, snapshot, null);
    assert.equal(revived.status, 'installed');
    if (revived.status === 'installed') {
      snapshot = revived.snapshot;
      assert.equal(snapshot.units['pkg.bio.u1-cell']?.active, true);
      assert.equal(snapshot.units['pkg.bio.u2-dna']?.active, false);
    }
    console.log('OK deleted-then-return reactivates retained unit');
  }

  section('Downgrade rejected');
  {
    const parsed = parseMathaZip(loadFixture('vocabulary'));
    parsed.manifest.revision = 1;
    // Probe against a clone with a higher installed revision (do not mutate live snapshot)
    const probe = structuredClone(snapshot);
    probe.packages['pkg.vocab.gre'] = {
      ...probe.packages['pkg.vocab.gre']!,
      revision: Math.max(probe.packages['pkg.vocab.gre']!.revision, 1) + 5,
    };
    const bytes = buildMathaZip({
      'manifest.json': JSON.stringify(parsed.manifest),
      'tree.json': JSON.stringify(parsed.tree),
      'units/pkg.vocab.u1-gre/unit.json': JSON.stringify(parsed.units['pkg.vocab.u1-gre']),
    });
    const result = importMathaBytes(bytes, probe, null);
    assert.equal(result.status, 'blocked');
    assert.ok(result.preview.issues.some((i) => i.code === 'revision.downgrade'));
    console.log('OK downgrade blocked');
  }

  section('Practice mix must sum to 1; review basic needs 1 card');
  {
    const badMix = buildMathaZip({
      'manifest.json': JSON.stringify({
        packageId: 'pkg.badmix',
        revision: 1,
        formatVersion: 1,
        scope: 'unit',
      }),
      'units/pkg.badmix.u1/unit.json': JSON.stringify({
        meta: { id: 'pkg.badmix.u1', version: 1, title: 'Bad mix' },
        practice: {
          sessionSize: 5,
          mix: { authored: 0.3, generated: 0.3 },
          generators: ['dice'],
        },
      }),
    });
    const r1 = importMathaBytes(badMix, snapshot, null);
    assert.equal(r1.status, 'blocked');
    assert.ok(r1.preview.issues.some((i) => i.code === 'practice.mix.sum'));
    console.log('OK mix sum validation');

    const badBasic = buildMathaZip({
      'manifest.json': JSON.stringify({
        packageId: 'pkg.badbasic',
        revision: 1,
        formatVersion: 1,
        scope: 'unit',
      }),
      'units/pkg.badbasic.u1/unit.json': JSON.stringify({
        meta: { id: 'pkg.badbasic.u1', version: 1, title: 'Bad basic' },
        review: {
          sources: [
            {
              id: 's1',
              kind: 'basic',
              front: 'a',
              back: 'b',
              cards: [
                { id: 'c1' },
                { id: 'c2' },
              ],
            },
          ],
        },
      }),
    });
    const r2 = importMathaBytes(badBasic, snapshot, null);
    assert.equal(r2.status, 'blocked');
    assert.ok(r2.preview.issues.some((i) => i.code === 'review.basic.cards'));
    console.log('OK basic card count validation');
  }

  section('Shipped sync is revision-aware (not fresh-store only)');
  {
    const base = buildShippedSnapshot('2026-01-01T00:00:00.000Z');
    const noop = syncShippedPackage(base, '2026-01-02T00:00:00.000Z');
    assert.equal(noop.status, 'noop');

    // Simulate older install
    const older = structuredClone(base);
    older.packages[SHIPPED_PACKAGE_ID]!.revision = shippedPackageRevision() - 1;
    older.packages[SHIPPED_PACKAGE_ID]!.contentFingerprint = 'stale';
    older.units['u1-dice']!.lesson!.intro = 'OLD INTRO';
    const updated = syncShippedPackage(older, '2026-01-03T00:00:00.000Z');
    assert.equal(updated.status, 'updated');
    assert.notEqual(updated.snapshot.units['u1-dice']!.lesson!.intro, 'OLD INTRO');
    assert.equal(
      updated.snapshot.packages[SHIPPED_PACKAGE_ID]!.revision,
      shippedPackageRevision(),
    );
    console.log('OK shipped sync updates on revision bump');

    // Downgrade keep
    const newer = structuredClone(base);
    newer.packages[SHIPPED_PACKAGE_ID]!.revision = shippedPackageRevision() + 10;
    const kept = syncShippedPackage(newer);
    assert.equal(kept.status, 'kept-newer');
    console.log('OK shipped sync refuses downgrade');
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
