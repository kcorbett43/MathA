/**
 * Geometry checks: every session point stays fully inside the plot.
 */
import assert from 'node:assert/strict';

import {
  SCORE_CHART_DOT_RADIUS,
  SCORE_CHART_EDGE_GAP,
  layoutScorePoints,
} from '../lib/scoreChartLayout';
import type { SessionScore } from '../lib/types';

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function makeScores(n: number): SessionScore[] {
  const base = Date.parse('2026-11-24T18:00:00.000Z');
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    mode: 'arithmetic' as const,
    durationMinutes: 0.5 as const,
    score: 5 + (i % 14),
    attempted: 5 + (i % 14),
    completedAt: new Date(base + i * 60_000).toISOString(),
  }));
}

const inset = SCORE_CHART_DOT_RADIUS + SCORE_CHART_EDGE_GAP;
const width = 320;
const height = 200;

check('24 points: first/last centers clear the dot radius from edges', () => {
  const { points } = layoutScorePoints(makeScores(24), width, height, inset);
  assert.equal(points.length, 24);
  const first = points[0];
  const last = points[points.length - 1];
  assert.ok(first.x >= SCORE_CHART_DOT_RADIUS, `first.x ${first.x}`);
  assert.ok(last.x <= width - SCORE_CHART_DOT_RADIUS, `last.x ${last.x}`);
  assert.ok(first.x + SCORE_CHART_DOT_RADIUS <= last.x - SCORE_CHART_DOT_RADIUS);
  // Even spread: last is the newest and sits at the right inset, not past it.
  assert.ok(Math.abs(last.x - (width - inset)) < 0.01, `last.x=${last.x} expected ${width - inset}`);
  assert.ok(Math.abs(first.x - inset) < 0.01);
});

check('all point disks stay inside [0,width] x [0,height]', () => {
  const { points } = layoutScorePoints(makeScores(24), width, height, inset);
  for (const p of points) {
    assert.ok(p.x - SCORE_CHART_DOT_RADIUS >= 0, `x-r ${p.id}`);
    assert.ok(p.x + SCORE_CHART_DOT_RADIUS <= width, `x+r ${p.id}`);
    assert.ok(p.y - SCORE_CHART_DOT_RADIUS >= 0, `y-r ${p.id}`);
    assert.ok(p.y + SCORE_CHART_DOT_RADIUS <= height, `y+r ${p.id}`);
  }
});

check('single point centered', () => {
  const { points } = layoutScorePoints(makeScores(1), width, height, inset);
  assert.equal(points.length, 1);
  assert.ok(Math.abs(points[0].x - width / 2) < 0.01);
});

console.log('All ScoreChart layout checks passed.');
