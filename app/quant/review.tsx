import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { packById } from '@/content/packs';
import { getQuantReview } from '@/lib/quantSessionStore';
import {
  quantSkillById,
  type QuantReviewItem,
  type QuantSkillId,
} from '@/lib/quantTypes';
import { colors } from '@/lib/theme';

function parseSkill(raw: string | string[] | undefined): QuantSkillId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'dice' || value === 'urns' || value === 'ev') return value;
  return 'dice';
}

function paramString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function QuantReviewScreen() {
  const params = useLocalSearchParams<{ skill?: string; pack?: string }>();
  const skillId = useMemo(() => parseSkill(params.skill), [params.skill]);
  const packIdParam = useMemo(() => paramString(params.pack), [params.pack]);

  const payload = useMemo(() => getQuantReview(), []);
  const packId = payload?.packId ?? packIdParam;
  const pack = packById(packId);

  const items: QuantReviewItem[] = payload?.items ?? [];
  const skill = quantSkillById(payload?.skillId ?? skillId);
  const correctCount = items.filter((i) => i.correct).length;
  const titleLabel = pack?.meta.title ?? skill?.label ?? 'Quant';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Review</Text>
          <Text style={styles.subtitle}>
            {titleLabel} · {correctCount}/{items.length} correct
          </Text>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 ? (
            <Text style={styles.empty}>
              No session to review. Start a Quant Learn unit or Practice skill from Home.
            </Text>
          ) : (
            items.map((item, i) => (
              <View key={`${i}-${item.correctAnswer}`} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.qIndex}>Q{i + 1}</Text>
                  <Text
                    style={[
                      styles.badge,
                      item.correct ? styles.badgeOk : styles.badgeBad,
                    ]}
                  >
                    {item.correct ? 'Correct' : 'Wrong'}
                  </Text>
                </View>
                <Text style={styles.prompt}>{item.prompt}</Text>
                <Text style={styles.answerLine}>
                  Your answer:{' '}
                  <Text style={styles.answerValue}>{item.userAnswer || '—'}</Text>
                </Text>
                {!item.correct ? (
                  <Text style={styles.answerLine}>
                    Correct:{' '}
                    <Text style={styles.correctValue}>{item.correctAnswer}</Text>
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.actions}>
          {pack ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Replay drill"
                onPress={() =>
                  router.replace({
                    pathname: '/quant/session',
                    params: { pack: pack.meta.id },
                  })
                }
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>Replay drill</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to lesson"
                onPress={() =>
                  router.replace({
                    pathname: '/quant/learn/[packId]',
                    params: { packId: pack.meta.id },
                  })
                }
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>Back to lesson</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Practice this skill"
                onPress={() =>
                  router.replace({
                    pathname: '/quant/session',
                    params: { skill: skill?.id ?? pack.drill.newTopicTags[0] },
                  })
                }
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>Practice this skill</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Learn units"
                onPress={() => router.replace('/quant/learn')}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>Learn units</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Practice more"
                onPress={() =>
                  router.replace({
                    pathname: '/quant/session',
                    params: { skill: skill?.id ?? skillId },
                  })
                }
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>Practice more</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skill list"
                onPress={() => router.replace('/quant/practice')}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>Skill list</Text>
              </Pressable>
            </>
          )}
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
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 4,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  empty: {
    fontSize: 15,
    color: colors.muted,
    paddingVertical: 24,
  },
  card: {
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeOk: {
    color: colors.success,
  },
  badgeBad: {
    color: colors.danger,
  },
  prompt: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  answerLine: {
    fontSize: 14,
    color: colors.subtle,
  },
  answerValue: {
    fontWeight: '600',
    color: colors.text,
  },
  correctValue: {
    fontWeight: '700',
    color: colors.success,
  },
  actions: {
    gap: 10,
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderRadius: 14,
    minHeight: 52,
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
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
});
