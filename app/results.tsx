import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadScores, saveScore } from '@/lib/storage';
import { colors } from '@/lib/theme';
import {
  durationLabel,
  modeLabel,
  parseGameMode,
  isCompetitionMode,
  pointsPerCorrect,
  parseDurationMinutes,
} from '@/lib/types';

function asString(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function asNumber(value: string | string[] | undefined): number {
  const n = Number.parseInt(asString(value) || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

export default function ResultsScreen() {
  const params = useLocalSearchParams<{
    correct?: string;
    attempted?: string;
    duration?: string;
    mode?: string;
    sessionId?: string;
  }>();

  const correct = asNumber(params.correct);
  const attempted = asNumber(params.attempted);
  const durationMinutes = parseDurationMinutes(params.duration);
  const mode = parseGameMode(params.mode);
  const competition = isCompetitionMode(mode);
  const score = correct * pointsPerCorrect(mode);
  const sessionId = asString(params.sessionId) || `fallback-${correct}-${attempted}-${mode}`;
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    void (async () => {
      const existing = await loadScores();
      if (existing.some((s) => s.id === sessionId)) return;
      await saveScore({
        id: sessionId,
        mode,
        durationMinutes,
        score,
        correct,
        attempted,
        completedAt: new Date().toISOString(),
      });
    })();
  }, [attempted, correct, durationMinutes, mode, score, sessionId]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.summary}>
          <Text style={styles.title}>Session complete</Text>
          <Text style={styles.subtitle}>
            {modeLabel(mode)} · {durationLabel(durationMinutes)}
          </Text>

          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>{competition ? 'Points' : 'Correct answers'}</Text>
          </View>

          <Text style={styles.detail}>{competition
            ? `${correct} correct answers · ${pointsPerCorrect(mode)} points each`
            : 'Score is raw correct count (exact match to advance)'}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.replace({
                pathname: competition ? '/competition/session' : '/drill/session',
                params: { mode, duration: String(durationMinutes) },
              })
            }
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
          <Link href="/dashboard" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Dashboard</Text>
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go home"
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  summary: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 16,
  },
  scoreBlock: {
    gap: 4,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 16,
    color: colors.subtle,
  },
  detail: {
    fontSize: 14,
    color: colors.muted,
  },
  actions: {
    gap: 12,
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
});
