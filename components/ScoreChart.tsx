import { StyleSheet, Text, View } from 'react-native';

import { dayKey } from '@/lib/storage';
import { colors } from '@/lib/theme';
import type { SessionScore } from '@/lib/types';

type ScoreChartProps = {
  scores: SessionScore[];
};

/**
 * Plots every score spaced by calendar day (x = day index, y = score).
 * Multiple sessions on the same day share the same x and stack as separate points.
 */
export function ScoreChart({ scores }: ScoreChartProps) {
  if (scores.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No scores in this range yet.</Text>
      </View>
    );
  }

  const sorted = [...scores].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  const uniqueDays = Array.from(new Set(sorted.map((s) => dayKey(s.completedAt))));
  const dayIndex = new Map(uniqueDays.map((d, i) => [d, i]));
  const maxScore = Math.max(...sorted.map((s) => s.score), 1);
  const chartH = 180;
  const chartW = Math.max(280, uniqueDays.length * 28);
  const padX = 12;
  const padY = 12;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  return (
    <View style={styles.wrap}>
      <View style={[styles.chart, { width: chartW, height: chartH }]}>
        <View style={styles.axisY}>
          <Text style={styles.axisLabel}>{maxScore}</Text>
          <Text style={styles.axisLabel}>0</Text>
        </View>
        <View style={styles.plotArea}>
          <View style={styles.baseline} />
          {sorted.map((s) => {
            const xi = dayIndex.get(dayKey(s.completedAt)) ?? 0;
            const x =
              uniqueDays.length === 1
                ? padX + plotW / 2
                : padX + (xi / (uniqueDays.length - 1)) * plotW;
            const y = padY + plotH - (s.score / maxScore) * plotH;
            return (
              <View
                key={s.id}
                style={[
                  styles.dot,
                  {
                    left: x - 5,
                    top: y - 5,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
      <Text style={styles.caption}>
        {sorted.length} session{sorted.length === 1 ? '' : 's'} · spaced by calendar day
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
  },
  axisY: {
    width: 36,
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingLeft: 6,
  },
  axisLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  plotArea: {
    flex: 1,
    position: 'relative',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 12,
    bottom: 12,
    height: 1,
    backgroundColor: colors.border,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  caption: {
    fontSize: 13,
    color: colors.muted,
  },
});
