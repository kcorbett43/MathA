import type { SessionScore } from '@/lib/types';

/** Selected-dot radius — layout insets must clear this so edge sessions aren't clipped. */
export const SCORE_CHART_DOT_RADIUS = 5;
/** Extra clearance beyond the dot (stroke / hit target / card radius). */
export const SCORE_CHART_EDGE_GAP = 16;

export type ScoreChartPoint = {
  x: number;
  y: number;
  score: number;
  id: string;
  completedAt: string;
};

/**
 * Map chronological sessions onto a plot of the given pixel size.
 * Point centers stay inset by `inset` on every side so dots/line ends stay
 * fully visible inside an overflow:hidden chart card.
 */
export function layoutScorePoints(
  scores: SessionScore[],
  width: number,
  height: number,
  inset: number,
): { points: ScoreChartPoint[]; yTop: number; yBot: number } {
  if (scores.length === 0 || width <= 0 || height <= 0) {
    return { points: [], yTop: 1, yBot: 0 };
  }

  const sorted = [...scores].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  const scoresOnly = sorted.map((s) => s.score);
  const maxS = Math.max(...scoresOnly, 1);
  const minS = Math.min(...scoresOnly, 0);
  const span = Math.max(maxS - minS, 1);
  const yMax = maxS + span * 0.08;
  const yMin = Math.max(0, minS - span * 0.08);

  const plotW = Math.max(width - inset * 2, 1);
  const plotH = Math.max(height - inset * 2, 1);

  const points: ScoreChartPoint[] = sorted.map((s, i) => {
    const x =
      sorted.length === 1 ? inset + plotW / 2 : inset + (i / (sorted.length - 1)) * plotW;
    const y = inset + plotH - ((s.score - yMin) / (yMax - yMin)) * plotH;
    return { x, y, score: s.score, id: s.id, completedAt: s.completedAt };
  });

  return {
    points,
    yTop: Math.round(yMax),
    yBot: Math.round(yMin),
  };
}
