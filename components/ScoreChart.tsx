import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { dayKey } from '@/lib/storage';
import { colors } from '@/lib/theme';
import type { SessionScore, TimeRange } from '@/lib/types';

type ScoreChartProps = {
  scores: SessionScore[];
  /** Dashboard time range — Day prefers time-of-day axis labels. */
  range: TimeRange;
};

type Point = { x: number; y: number; score: number; id: string; completedAt: string };

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
 * Callers must filter to a single drill duration (scores aren't comparable
 * across lengths). Every session gets its own x from completedAt (session
 * index if timestamps collide) so same-day drills spread across the plot —
 * never collapsed into a calendar-day bucket. Tap a point to see its score.
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

  useEffect(() => {
    setSelectedId(null);
  }, [scores, range]);

  const chartH = 200;
  const padL = 8;
  const padR = 12;
  const padT = 16;
  const padB = 16;
  const hit = 24;
  const calloutW = 44;
  const calloutH = 24;

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

    const scoresOnly = sorted.map((s) => s.score);
    const maxS = Math.max(...scoresOnly, 1);
    const minS = Math.min(...scoresOnly, 0);
    const span = Math.max(maxS - minS, 1);
    const yMax = maxS + span * 0.08;
    const yMin = Math.max(0, minS - span * 0.08);

    const plotW = Math.max(width - padL - padR, 1);
    const plotH = chartH - padT - padB;

    const times = sorted.map((s) => new Date(s.completedAt).getTime());
    const tMin = times[0];
    const tMax = times[times.length - 1];
    const tSpan = tMax - tMin;
    // Duplicate timestamps would share an x — fall back to even index spacing.
    const hasTimeCollision = times.some((t, i) => i > 0 && t === times[i - 1]);
    const useIndexX = sorted.length > 1 && (tSpan <= 0 || hasTimeCollision);

    const pts: Point[] = sorted.map((s, i) => {
      let x: number;
      if (sorted.length === 1) {
        x = padL + plotW / 2;
      } else if (useIndexX) {
        x = padL + (i / (sorted.length - 1)) * plotW;
      } else {
        x = padL + ((times[i] - tMin) / tSpan) * plotW;
      }
      const y = padT + plotH - ((s.score - yMin) / (yMax - yMin)) * plotH;
      return { x, y, score: s.score, id: s.id, completedAt: s.completedAt };
    });

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

    const firstIso = sorted[0].completedAt;
    const lastIso = sorted[sorted.length - 1].completedAt;
    const sameDay = dayKey(firstIso) === dayKey(lastIso);
    // Day range, or a multi-session span that fits one calendar day → time labels.
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
      yTop: Math.round(yMax),
      yBot: Math.round(yMin),
      xLabels: labels,
      segments: segs,
    };
  }, [sorted, width, range]);

  const selected = points.find((p) => p.id === selectedId) ?? null;

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
      padL,
      Math.min(selected.x - calloutW / 2, Math.max(padL, width - padR - calloutW)),
    );
    calloutTop = selected.y - calloutH - 10;
    if (calloutTop < 2) {
      calloutTop = selected.y + 12;
    }
  }

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
            {points.map((p) => {
              const isSelected = p.id === selectedId;
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
