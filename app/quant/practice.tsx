import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QUANT_SKILLS } from '@/lib/quantTypes';
import { colors } from '@/lib/theme';

export default function QuantPracticeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Practice</Text>
          <Text style={styles.subtitle}>
            Pure fluency reps. Fixed sets, Submit advances, review at the end.
          </Text>
        </View>

        <View style={styles.list}>
          {QUANT_SKILLS.map((skill) => (
            <Pressable
              key={skill.id}
              accessibilityRole="button"
              accessibilityLabel={`Start ${skill.label}`}
              onPress={() =>
                router.push({
                  pathname: '/quant/session',
                  params: { skill: skill.id },
                })
              }
              style={({ pressed }) => [styles.skillRow, pressed && styles.pressed]}
            >
              <View style={styles.skillText}>
                <Text style={styles.skillLabel}>{skill.label}</Text>
                <Text style={styles.skillBlurb}>{skill.blurb}</Text>
                <Text style={styles.skillMeta}>{skill.questionCount} questions</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
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
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
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
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  skillText: {
    flex: 1,
    gap: 4,
  },
  skillLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  skillBlurb: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  skillMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
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
