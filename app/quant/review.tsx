import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  quantSkillById,
  type QuantReviewItem,
  type QuantSkillId,
} from '@/lib/quantTypes';
import { getQuantReview } from '@/lib/quantSessionStore';
import { colors } from '@/lib/theme';

function parseSkill(raw: string | string[] | undefined): QuantSkillId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'dice' || value === 'urns' || value === 'ev') return value;
  return 'dice';
}

export default function QuantReviewScreen() {
  const params = useLocalSearchParams<{ skill?: string }>();
  const skillId = useMemo(() => parseSkill(params.skill), [params.skill]);

  const payload = useMemo(() => getQuantReview(), []);

  const items: QuantReviewItem[] = payload?.items ?? [];
  const skill = quantSkillById(payload?.skillId ?? skillId);
  const correctCount = items.filter((i) => i.correct).length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Review</Text>
          <Text style={styles.subtitle}>
            {skill?.label ?? 'Quant'} · {correctCount}/{items.length} correct
          </Text>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 ? (
            <Text style={styles.empty}>No session to review. Start a Quant skill from Home.</Text>
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
            onPress={() => router.replace('/quant')}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Skill list</Text>
          </Pressable>
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
