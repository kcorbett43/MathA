import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>MathA</Text>
          <Text style={styles.tagline}>Mental math and structured learning.</Text>
        </View>

        <View style={styles.list}>
          <Link href="/drill" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Drill"
              style={({ pressed }) => [styles.row, styles.rowPrimary, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Drill</Text>
                <Text style={styles.rowBlurb}>
                  Timed mental math — pick a mode and duration, track scores on the dashboard
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Link>

          <Link href="/quant" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Learn"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Learn</Text>
                <Text style={styles.rowBlurb}>
                  Nested collections and unit packs, plus skill practice
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
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
    gap: 32,
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
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowPrimary: {
    borderColor: colors.primary,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  rowBlurb: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  chevron: {
    fontSize: 28,
    color: colors.muted,
    lineHeight: 28,
  },
  pressed: {
    opacity: 0.85,
  },
});
