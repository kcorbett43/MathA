import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { packById } from '@/content/packs';
import { formatMixLabel } from '@/lib/learnDrill';
import { colors } from '@/lib/theme';

export default function QuantLearnLessonScreen() {
  const params = useLocalSearchParams<{ packId?: string }>();
  const packId = Array.isArray(params.packId) ? params.packId[0] : params.packId;
  const pack = useMemo(() => packById(packId), [packId]);

  if (!pack) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <View style={styles.missing}>
          <Text style={styles.title}>Unit not found</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/quant/learn')}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Back to Collections</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { lesson, meta } = pack;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.shell}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text style={styles.kicker}>Unit {meta.order}</Text>
            <Text style={styles.title}>{meta.title}</Text>
            <Text style={styles.lead}>{lesson.intro}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Definitions</Text>
            {lesson.definitions.map((def) => (
              <View key={def.term} style={styles.defBlock}>
                <Text style={styles.defTerm}>{def.term}</Text>
                <Text style={styles.defBody}>{def.body}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Try these first</Text>
            <Text style={styles.sectionLead}>
              Attempt each example with the same pad as Practice. Steps and the
              answer unlock after you submit — or tap Show solution.
            </Text>
            {lesson.examples.map((ex, i) => (
              <View key={`${ex.title}-${i}`} style={styles.example}>
                <Text style={styles.exampleTitle}>
                  {i + 1}. {ex.title}
                </Text>
                <Text style={styles.examplePrompt}>{ex.prompt}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Try example ${i + 1}: ${ex.title}`}
                  onPress={() =>
                    router.push({
                      pathname: '/quant/learn/example',
                      params: { packId: meta.id, i: String(i) },
                    })
                  }
                  style={({ pressed }) => [
                    styles.tryBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.tryBtnText}>Try</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Text style={styles.mixNote}>{formatMixLabel(pack)}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start practice drill"
            onPress={() =>
              router.push({
                pathname: '/quant/session',
                params: { pack: meta.id },
              })
            }
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Start practice</Text>
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
  shell: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 4,
    gap: 28,
  },
  missing: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
  },
  intro: {
    gap: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.text,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.subtle,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginTop: -4,
  },
  defBlock: {
    gap: 4,
    paddingVertical: 4,
  },
  defTerm: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  defBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.subtle,
  },
  example: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  examplePrompt: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.subtle,
    fontWeight: '600',
  },
  tryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  mixNote: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
