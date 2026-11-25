import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { dayKey } from '@/lib/storage';
import {
  SCORE_CHART_DOT_RADIUS,
  SCORE_CHART_EDGE_GAP,
  layoutScorePoints,
  type ScoreChartPoint,
} from '@/lib/scoreChartLayout';
import { colors } from '@/lib/theme';
import type { SessionScore, TimeRange } from '@/lib/types';

export {
  SCORE_CHART_DOT_RADIUS,
  SCORE_CHART_EDGE_GAP,
  layoutScorePoints,
} from '@/lib/scoreChartLayout';

type ScoreChartProps = {
  scores: SessionScore[];
  /** Dashboard time range — Day prefers time-of-day axis labels. */
  range: TimeRange;
};

/** Local time-of-day label, e.g. "2:15 PM". */
function formatTimeOfDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Chess.com-style Elo chart: continuous score-over-time line.
 * Drawn with plain RN Views (no react-native-svg) so Expo Go never hits
 * "Unable to resolve module react-native-svg".
 *
 * Callers must filter to a single drill duration. Points are spaced evenly
 * in chronological order across the plot with enough inset that the newest
 * (rightmost) and oldest (leftmost) dots stay fully inside the card.
 */
export function ScoreChart({ scores, range }: ScoreChartProps) {
  const [width, setWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...scores].sort(
        (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
      ),
    [scores],
  );

  const chartH = 200;
  const inset = SCORE_CHART_DOT_RADIUS + SCORE_CHART_EDGE_GAP;
  const hit = 24;
  const calloutW = 44;
  const calloutH = 24;

  const { points, yTop, yBot, xLabels, segments } = useMemo(() => {
    if (sorted.length === 0 || width <= 0) {
      return {
        points: [] as ScoreChartPoint[],
        yTop: 1,
        yBot: 0,
        xLabels: [] as string[],
        segments: [] as { key: string; left: number; top: number; width: number; angle: number }[],
      };
    }

    const laid = layoutScorePoints(sorted, width, chartH, inset);
    const pts = laid.points;

    const segs: { key: string; left: number; top: number; width: number; angle: number }[] = [];
    const stroke = 2.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      segs.push({
        key: `${a.id}-${b.id}`,
        left: (a.x + b.x) / 2 - len / 2,
        top: (a.y + b.y) / 2 - stroke / 2,
        width: len,
        angle,
      });
    }

    const firstIso = sorted[0].completedAt;
    const lastIso = sorted[sorted.length - 1].completedAt;
    const sameDay = dayKey(firstIso) === dayKey(lastIso);
    const useTimeLabels = range === 'day' || sameDay;

    let labels: string[];
    if (useTimeLabels) {
      const first = formatTimeOfDay(firstIso);
      const last = formatTimeOfDay(lastIso);
      labels = first === last ? [first] : [first, last];
    } else {
      const first = dayKey(firstIso);
      const last = dayKey(lastIso);
      labels = first === last ? [first] : [first, last];
    }

    return {
      points: pts,
      yTop: laid.yTop,
      yBot: laid.yBot,
      xLabels: labels,
      segments: segs,
    };
  }, [sorted, width, range, inset]);

  const selected = points.find((p) => p.id === selectedId) ?? null;
  const activeSelectedId = selected?.id ?? null;

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

  let calloutLeft = 0;
  let calloutTop = 0;
  if (selected) {
    calloutLeft = Math.max(
      inset,
      Math.min(selected.x - calloutW / 2, Math.max(inset, width - inset - calloutW)),
    );
    calloutTop = selected.y - calloutH - 10;
    if (calloutTop < 2) {
      calloutTop = selected.y + 12;
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chart}>
        <View style={styles.axisY}>
          <Text style={styles.axisLabel}>{yTop}</Text>
          <Text style={styles.axisLabel}>{yBot}</Text>
        </View>
        {/* Width of the plot column only — never the full card (Y-axis would skew x). */}
        <View style={styles.plotCol} onLayout={onLayout}>
          <View style={[styles.plot, { height: chartH }]}>
            <View
              style={[styles.baseline, { left: inset, right: inset, bottom: inset }]}
            />
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
            {points.map((p) => {
              const isSelected = p.id === activeSelectedId;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Session score ${p.score}`}
                  hitSlop={4}
                  onPress={() => setSelectedId((cur) => (cur === p.id ? null : p.id))}
                  style={[
                    styles.dotHit,
                    {
                      left: p.x - hit / 2,
                      top: p.y - hit / 2,
                      width: hit,
                      height: hit,
                    },
                  ]}
                >
                  <View style={[styles.dot, isSelected && styles.dotSelected]} />
                </Pressable>
              );
            })}
            {selected ? (
              <View
                pointerEvents="none"
                style={[
                  styles.callout,
                  {
                    left: calloutLeft,
                    top: calloutTop,
                    width: calloutW,
                    height: calloutH,
                  },
                ]}
              >
                <Text style={styles.calloutText}>{selected.score}</Text>
              </View>
            ) : null}
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
        {selected
          ? `Score ${selected.score} · ${formatTimeOfDay(selected.completedAt)}`
          : `${sorted.length} session${sorted.length === 1 ? '' : 's'} · score over time`}
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
    // Clip to rounded card, but layoutScorePoints insets so dots never meet the edge.
    overflow: 'hidden',
    paddingTop: 8,
    paddingBottom: 8,
    // Keep plotCol short of the card’s right radius so the newest dot isn’t clipped.
    paddingRight: 14,
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
    minWidth: 0,
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
  dotHit: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dotSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  callout: {
    position: 'absolute',
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  calloutText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
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
