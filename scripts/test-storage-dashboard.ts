/**
 * Unit checks for score filter / latest / duration matching used by the dashboard.
 */
import assert from 'node:assert/strict';

import { filterScores, latestScore } from '../lib/storage';
import type { SessionScore } from '../lib/types';

function score(
  partial: Partial<SessionScore> & Pick<SessionScore, 'id' | 'completedAt' | 'durationMinutes'>,
): SessionScore {
  return {
    mode: 'arithmetic',
    score: 10,
    attempted: 10,
    ...partial,
  };
}

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

check('latestScore picks newest by completedAt', () => {
  const all = [
    score({ id: 'a', durationMinutes: 2, completedAt: '2026-11-23T10:00:00.000Z', score: 5 }),
    score({ id: 'b', durationMinutes: 0.5, completedAt: '2026-11-24T18:00:00.000Z', score: 12 }),
    score({ id: 'c', durationMinutes: 1, completedAt: '2026-11-24T12:00:00.000Z', score: 8 }),
  ];
  assert.equal(latestScore(all)?.id, 'b');
});

check('filterScores includes 0.5 duration with numeric equality', () => {
  const all = [
    score({ id: 'a', durationMinutes: 0.5, completedAt: '2026-11-24T18:00:00.000Z' }),
    score({ id: 'b', durationMinutes: 2, completedAt: '2026-11-24T18:01:00.000Z' }),
  ];
  const filtered = filterScores(all, 'arithmetic', 'all', 0.5);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'a');
});

check('filterScores month keeps today sessions', () => {
  const now = new Date('2026-11-24T20:00:00.000Z');
  const all = [
    score({ id: 'old', durationMinutes: 0.5, completedAt: '2026-10-01T00:00:00.000Z' }),
    score({ id: 'new', durationMinutes: 0.5, completedAt: '2026-11-24T19:00:00.000Z' }),
  ];
  const filtered = filterScores(all, 'arithmetic', 'month', 0.5, now);
  assert.deepEqual(
    filtered.map((s) => s.id),
    ['new'],
  );
});

check('filterScores drops invalid completedAt', () => {
  const all = [
    score({ id: 'bad', durationMinutes: 0.5, completedAt: 'not-a-date' }),
    score({ id: 'ok', durationMinutes: 0.5, completedAt: '2026-11-24T19:00:00.000Z' }),
  ];
  const filtered = filterScores(all, 'arithmetic', 'all', 0.5);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'ok');
});

console.log('All storage dashboard checks passed.');
