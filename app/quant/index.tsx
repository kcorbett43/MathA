import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

export default function LearnHubScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Learn</Text>
          <Text style={styles.subtitle}>
            Browse nested collections and unit packs, or run pure skill practice. No timer, no
            dashboard Elo.
          </Text>
        </View>

        <View style={styles.list}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open collections"
            onPress={() => router.push('/quant/learn')}
            style={({ pressed }) => [styles.row, styles.rowPrimary, pressed && styles.pressed]}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Collections</Text>
              <Text style={styles.rowBlurb}>
                Nested folders → units: light defs, worked examples, then mixed practice
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Practice skills"
            onPress={() => router.push('/quant/practice')}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Practice</Text>
              <Text style={styles.rowBlurb}>
                Skill reps — fixed sets, Submit advances, review at the end
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
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
    gap: 24,
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
    fontSize: 20,
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
