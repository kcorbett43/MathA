import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ChipRow } from '@/components/ChipRow';
import { ScoreChart } from '@/components/ScoreChart';
import { dayKey, filterScores, loadScores } from '@/lib/storage';
import { colors } from '@/lib/theme';
import {
  DURATIONS,
  MODES,
  TIME_RANGES,
  durationLabel,
  modeLabel,
  type DurationMinutes,
  type GameMode,
  type SessionScore,
  type TimeRange,
} from '@/lib/types';

function sessionDurationLabel(durationMinutes: number): string {
  if ((DURATIONS as number[]).includes(durationMinutes)) {
    return durationLabel(durationMinutes as DurationMinutes);
  }
  return `${durationMinutes} min`;
}

export default function DashboardScreen() {
  const [mode, setMode] = useState<GameMode>('arithmetic');
  const [range, setRange] = useState<TimeRange>('month');
  const [scores, setScores] = useState<SessionScore[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void loadScores().then((all) => {
        if (!active) return;
        setScores(all);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const filtered = filterScores(scores, mode, range);
  const sortedDesc = [...filtered].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mode</Text>
          <ChipRow
            accessibilityPrefix="Mode"
            chips={MODES.map((m) => ({ id: m.id, label: m.label }))}
            selected={mode}
            onSelect={setMode}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Range</Text>
          <ChipRow
            accessibilityPrefix="Range"
            chips={TIME_RANGES.map((r) => ({ id: r.id, label: r.label }))}
            selected={range}
            onSelect={setRange}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>{modeLabel(mode)} scores</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <ScoreChart scores={filtered} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sessions</Text>
          {loading ? null : sortedDesc.length === 0 ? (
            <Text style={styles.empty}>No sessions yet for this filter.</Text>
          ) : (
            <View style={styles.list}>
              {sortedDesc.map((s) => (
                <View key={s.id} style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowScore}>{s.score}</Text>
                    <Text style={styles.rowMeta}>
                      {dayKey(s.completedAt)} · {sessionDurationLabel(s.durationMinutes)}
                    </Text>
                  </View>
                  <Text style={styles.rowAttempted}>{s.score} correct</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh scores"
          onPress={() => {
            setLoading(true);
            void loadScores().then((all) => {
              setScores(all);
              setLoading(false);
            });
          }}
          style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: {
    gap: 2,
  },
  rowScore: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  rowMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  rowAttempted: {
    fontSize: 13,
    color: colors.muted,
  },
  refresh: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
  },
});
