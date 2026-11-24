import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipRow } from '@/components/ChipRow';
import { colors } from '@/lib/theme';
import {
  DEFAULT_DURATION_MINUTES,
  DURATIONS,
  MODES,
  durationLabel,
  type DurationMinutes,
  type GameMode,
} from '@/lib/types';

export default function DrillHomeScreen() {
  const [mode, setMode] = useState<GameMode>('arithmetic');
  const [duration, setDuration] = useState<DurationMinutes>(DEFAULT_DURATION_MINUTES);

  const selectedBlurb = MODES.find((m) => m.id === mode)?.blurb ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Drill</Text>
          <Text style={styles.subtitle}>
            Timed mental math. Local scores only — charted on the dashboard by mode.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mode</Text>
          <ChipRow
            accessibilityPrefix="Mode"
            chips={MODES.map((m) => ({ id: m.id, label: m.label }))}
            selected={mode}
            onSelect={setMode}
          />
          <Text style={styles.hint}>{selectedBlurb}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <ChipRow
            accessibilityPrefix="Duration"
            chips={DURATIONS.map((d) => ({ id: d, label: durationLabel(d) }))}
            selected={duration}
            onSelect={setDuration}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Begin timed session"
            onPress={() =>
              router.push({
                pathname: '/drill/session',
                params: { mode, duration: String(duration) },
              })
            }
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>Begin</Text>
          </Pressable>

          <Link href="/dashboard" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open score dashboard"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Dashboard</Text>
            </Pressable>
          </Link>
        </View>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 28,
  },
  intro: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 360,
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
  hint: {
    fontSize: 14,
    color: colors.muted,
  },
  actions: {
    marginTop: 'auto',
    gap: 12,
    paddingTop: 12,
  },
  cta: {
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
  ctaText: {
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
