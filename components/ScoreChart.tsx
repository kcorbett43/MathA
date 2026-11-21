import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Line as SvgLine } from 'react-native-svg';

import { dayKey } from '@/lib/storage';
import { colors } from '@/lib/theme';
import type { SessionScore } from '@/lib/types';

type ScoreChartProps = {
  scores: SessionScore[];
};

type Point = { x: number; y: number; score: number; id: string; at: number };

/**
 * Chess.com-style Elo chart: continuous score-over-time line.
 * Sessions are plotted chronologically; X is calendar-day spaced (multiple
 * sessions on the same day share the day column, ordered within the day).
 */
export function ScoreChart({ scores }: ScoreChartProps) {
  const [width, setWidth] = useState(0);

  const sorted = useMemo(
    () =>
      [...scores].sort(
        (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
      ),
    [scores],
  );

  const chartH = 200;
  const padL = 8;
  const padR = 12;
  const padT = 16;
  const padB = 16;

  const { points, maxScore, minScore, dayLabels } = useMemo(() => {
    if (sorted.length === 0) {
      return { points: [] as Point[], maxScore: 1, minScore: 0, dayLabels: [] as string[] };
    }

    const uniqueDays = Array.from(new Set(sorted.map((s) => dayKey(s.completedAt))));
    const byDay = new Map<string, SessionScore[]>();
    for (const s of sorted) {
      const k = dayKey(s.completedAt);
      const list = byDay.get(k) ?? [];
      list.push(s);
      byDay.set(k, list);
    }

    const scoresOnly = sorted.map((s) => s.score);
    const maxS = Math.max(...scoresOnly, 1);
    const minS = Math.min(...scoresOnly, 0);
    // Pad y-range slightly so the line doesn't hug the edges
    const span = Math.max(maxS - minS, 1);
    const yMax = maxS + span * 0.08;
    const yMin = Math.max(0, minS - span * 0.08);

    const plotW = Math.max(width - padL - padR, 1);
    const plotH = chartH - padT - padB;
    const dayCount = uniqueDays.length;

    const pts: Point[] = [];
    for (let di = 0; di < dayCount; di++) {
      const day = uniqueDays[di];
      const daySessions = byDay.get(day) ?? [];
      const dayX =
        dayCount === 1 ? padL + plotW / 2 : padL + (di / (dayCount - 1)) * plotW;

      daySessions.forEach((s, si) => {
        // Slight horizontal stagger within a day so multiple sessions remain visible
        const stagger =
          daySessions.length === 1
            ? 0
            : ((si / (daySessions.length - 1)) - 0.5) * Math.min(18, plotW / Math.max(dayCount, 1) * 0.35);
        const x = dayX + stagger;
        const y = padT + plotH - ((s.score - yMin) / (yMax - yMin)) * plotH;
        pts.push({
          x,
          y,
          score: s.score,
          id: s.id,
          at: new Date(s.completedAt).getTime(),
        });
      });
    }

    const labels =
      uniqueDays.length <= 1
        ? uniqueDays
        : [uniqueDays[0], uniqueDays[uniqueDays.length - 1]];

    return { points: pts, maxScore: yMax, minScore: yMin, dayLabels: labels };
  }, [sorted, width]);

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baseY = chartH - padB;
    const head = `M ${points[0].x} ${baseY} L ${points[0].x} ${points[0].y}`;
    const mid = points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
    const tail = `L ${points[points.length - 1].x} ${baseY} Z`;
    return `${head} ${mid} ${tail}`;
  }, [points]);

  if (scores.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No scores in this range yet.</Text>
      </View>
    );
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  const yTop = Math.round(maxScore);
  const yBot = Math.round(minScore);

  return (
    <View style={styles.wrap}>
      <View style={styles.chart} onLayout={onLayout}>
        <View style={styles.axisY}>
          <Text style={styles.axisLabel}>{yTop}</Text>
          <Text style={styles.axisLabel}>{yBot}</Text>
        </View>
        <View style={styles.plotCol}>
          {width > 0 ? (
            <Svg width={width} height={chartH}>
              <Defs>
                <LinearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.28" />
                  <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>
              <SvgLine
                x1={padL}
                y1={chartH - padB}
                x2={width - padR}
                y2={chartH - padB}
                stroke={colors.border}
                strokeWidth={1}
              />
              {areaPath ? <Path d={areaPath} fill="url(#scoreFill)" /> : null}
              {linePath ? (
                <Path
                  d={linePath}
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {points.map((p) => (
                <Circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={colors.surface}
                  stroke={colors.primary}
                  strokeWidth={2}
                />
              ))}
            </Svg>
          ) : (
            <View style={{ height: chartH }} />
          )}
          <View style={styles.axisX}>
            <Text style={styles.axisLabel}>{dayLabels[0] ?? ''}</Text>
            {dayLabels.length > 1 ? (
              <Text style={styles.axisLabel}>{dayLabels[dayLabels.length - 1]}</Text>
            ) : null}
          </View>
        </View>
      </View>
      <Text style={styles.caption}>
        {sorted.length} session{sorted.length === 1 ? '' : 's'} · score over time
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  empty: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
  },
  chart: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingTop: 4,
    paddingBottom: 8,
    paddingRight: 4,
  },
  axisY: {
    width: 36,
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingLeft: 6,
  },
  axisLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  plotCol: {
    flex: 1,
  },
  axisX: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  caption: {
    fontSize: 13,
    color: colors.muted,
  },
});
