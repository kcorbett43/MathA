import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipRow } from '@/components/ChipRow';
import { colors } from '@/lib/theme';
import {
  DURATIONS,
  MODES,
  type DurationMinutes,
  type GameMode,
} from '@/lib/types';

export default function HomeScreen() {
  const [mode, setMode] = useState<GameMode>('arithmetic');
  const [duration, setDuration] = useState<DurationMinutes>(2);

  const selectedBlurb = MODES.find((m) => m.id === mode)?.blurb ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>MathA</Text>
          <Text style={styles.tagline}>Timed mental math. Local scores only.</Text>
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
            chips={DURATIONS.map((d) => ({ id: d, label: `${d} min` }))}
            selected={duration}
            onSelect={setDuration}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start drill"
            onPress={() =>
              router.push({
                pathname: '/drill',
                params: { mode, duration: String(duration) },
              })
            }
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>Start drill</Text>
          </Pressable>

          <Link href="/dashboard" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open dashboard"
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
    paddingTop: 24,
    gap: 28,
  },
  hero: {
    gap: 10,
    paddingTop: 24,
  },
  brand: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.text,
  },
  tagline: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.subtle,
    maxWidth: 320,
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
