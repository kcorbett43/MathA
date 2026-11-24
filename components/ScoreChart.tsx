import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';
import { durationLabel, type DurationMinutes, type SessionScore } from '@/lib/types';

type ScoreChartProps = {
  scores: SessionScore[];
};

type Point = { x: number; y: number; score: number; id: string };

function durationAxisLabel(minutes: number): string {
  return durationLabel(minutes as DurationMinutes);
}

/**
 * Chess.com-style Elo chart: score vs drill duration.
 * Drawn with plain RN Views (no react-native-svg) so Expo Go never hits
 * "Unable to resolve module react-native-svg".
 *
 * X is session duration (30 sec, 1 min, 2 min, …) so scores spread across
 * drill lengths instead of stacking on a single calendar-day bucket.
 */
export function ScoreChart({ scores }: ScoreChartProps) {
  const [width, setWidth] = useState(0);

  // Chronological within each duration keeps same-length sessions ordered;
  // overall sort by duration so the line reads left→right by drill length.
  const sorted = useMemo(
    () =>
      [...scores].sort((a, b) => {
        const d = a.durationMinutes - b.durationMinutes;
        if (d !== 0) return d;
        return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      }),
    [scores],
  );

  const chartH = 200;
  const padL = 8;
  const padR = 12;
  const padT = 16;
  const padB = 16;

  const { points, yTop, yBot, xLabels, segments } = useMemo(() => {
    if (sorted.length === 0 || width <= 0) {
      return {
        points: [] as Point[],
        yTop: 1,
        yBot: 0,
        xLabels: [] as string[],
        segments: [] as { key: string; left: number; top: number; width: number; angle: number }[],
      };
    }

    const uniqueDurations = Array.from(
      new Set(sorted.map((s) => s.durationMinutes)),
    ).sort((a, b) => a - b);

    const byDuration = new Map<number, SessionScore[]>();
    for (const s of sorted) {
      const list = byDuration.get(s.durationMinutes) ?? [];
      list.push(s);
      byDuration.set(s.durationMinutes, list);
    }

    const scoresOnly = sorted.map((s) => s.score);
    const maxS = Math.max(...scoresOnly, 1);
    const minS = Math.min(...scoresOnly, 0);
    const span = Math.max(maxS - minS, 1);
    const yMax = maxS + span * 0.08;
    const yMin = Math.max(0, minS - span * 0.08);

    const plotW = Math.max(width - padL - padR, 1);
    const plotH = chartH - padT - padB;
    const durationCount = uniqueDurations.length;

    const pts: Point[] = [];
    for (let di = 0; di < durationCount; di++) {
      const duration = uniqueDurations[di];
      const durationSessions = byDuration.get(duration) ?? [];
      const durationX =
        durationCount === 1
          ? padL + plotW / 2
          : padL + (di / (durationCount - 1)) * plotW;

      durationSessions.forEach((s, si) => {
        const stagger =
          durationSessions.length === 1
            ? 0
            : ((si / (durationSessions.length - 1)) - 0.5) *
              Math.min(18, (plotW / Math.max(durationCount, 1)) * 0.35);
        const x = durationX + stagger;
        const y = padT + plotH - ((s.score - yMin) / (yMax - yMin)) * plotH;
        pts.push({ x, y, score: s.score, id: s.id });
      });
    }

    const segs: { key: string; left: number; top: number; width: number; angle: number }[] = [];
    const stroke = 2.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Position from segment midpoint so RN's default center transform-origin works.
      segs.push({
        key: `${a.id}-${b.id}`,
        left: (a.x + b.x) / 2 - len / 2,
        top: (a.y + b.y) / 2 - stroke / 2,
        width: len,
        angle,
      });
    }

    const labels =
      uniqueDurations.length <= 1
        ? uniqueDurations.map(durationAxisLabel)
        : [
            durationAxisLabel(uniqueDurations[0]),
            durationAxisLabel(uniqueDurations[uniqueDurations.length - 1]),
          ];

    return {
      points: pts,
      yTop: Math.round(yMax),
      yBot: Math.round(yMin),
      xLabels: labels,
      segments: segs,
    };
  }, [sorted, width]);

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

  return (
    <View style={styles.wrap}>
      <View style={styles.chart} onLayout={onLayout}>
        <View style={styles.axisY}>
          <Text style={styles.axisLabel}>{yTop}</Text>
          <Text style={styles.axisLabel}>{yBot}</Text>
        </View>
        <View style={styles.plotCol}>
          <View style={[styles.plot, { height: chartH }]}>
            <View style={[styles.baseline, { left: padL, right: padR, bottom: padB }]} />
            {segments.map((seg) => (
              <View
                key={seg.key}
                pointerEvents="none"
                style={[
                  styles.segment,
                  {
                    left: seg.left,
                    top: seg.top,
                    width: seg.width,
                    transform: [{ rotate: `${seg.angle}deg` }],
                  },
                ]}
              />
            ))}
            {points.map((p) => (
              <View
                key={p.id}
                pointerEvents="none"
                style={[styles.dot, { left: p.x - 4, top: p.y - 4 }]}
              />
            ))}
          </View>
          <View style={styles.axisX}>
            <Text style={styles.axisLabel}>{xLabels[0] ?? ''}</Text>
            {xLabels.length > 1 ? (
              <Text style={styles.axisLabel}>{xLabels[xLabels.length - 1]}</Text>
            ) : null}
          </View>
        </View>
      </View>
      <Text style={styles.caption}>
        {sorted.length} session{sorted.length === 1 ? '' : 's'} · score by duration
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
  plot: {
    position: 'relative',
    width: '100%',
  },
  baseline: {
    position: 'absolute',
    height: 1,
    backgroundColor: colors.border,
  },
  segment: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
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
