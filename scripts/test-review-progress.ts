/**
 * Smoke tests for Review self-rating progress helpers (no AsyncStorage).
 * Run: npm run test:review
 */
import assert from 'node:assert/strict';

import {
  CARD_RATINGS,
  isCardRating,
  readCardProgressData,
} from '../lib/reviewProgress';
import { progressKey } from '../content/store/ids';

function section(title: string) {
  console.log(`\n== ${title}`);
}

section('CardRating guards');
{
  for (const r of CARD_RATINGS) {
    assert.ok(isCardRating(r), r);
  }
  assert.equal(isCardRating('knew'), false);
  assert.equal(isCardRating(null), false);
  console.log('OK rating guards');
}

section('readCardProgressData');
{
  assert.equal(readCardProgressData(undefined), null);
  assert.equal(readCardProgressData({}), null);
  assert.equal(readCardProgressData({ lastRating: 'good' }), null);
  const row = readCardProgressData({
    lastRating: 'easy',
    ratedAt: '2026-11-22T00:00:00.000Z',
    reps: 3,
  });
  assert.deepEqual(row, {
    lastRating: 'easy',
    ratedAt: '2026-11-22T00:00:00.000Z',
    reps: 3,
  });
  console.log('OK progress data parse');
}

section('progressKey triple');
{
  const key = progressKey('matha.shipped.probability-foundations', 'u1-dice', 'c-outcome');
  assert.ok(key.includes('u1-dice'));
  assert.ok(key.includes('c-outcome'));
  console.log('OK progress key');
}

console.log('\nAll review progress smoke tests passed.');
