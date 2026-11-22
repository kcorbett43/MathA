import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardsInPack, packById } from '@/content/packs';
import { useContentStore } from '@/lib/content/ContentStoreProvider';
import { colors } from '@/lib/theme';

function paramString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function LearnCardsReviewScreen() {
  const { snapshot } = useContentStore();
  const params = useLocalSearchParams<{ packId?: string }>();
  const packId = paramString(params.packId);
  const pack = useMemo(() => packById(packId), [packId, snapshot]);
  const cards = useMemo(() => (pack ? cardsInPack(pack) : []), [pack]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const safeIndex = cards.length === 0 ? 0 : Math.min(index, cards.length - 1);
  const card = cards[safeIndex];

  if (!pack) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <View style={styles.missing}>
          <Text style={styles.title}>Unit not found</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <View style={styles.missing}>
          <Text style={styles.title}>No cards yet</Text>
          <Text style={styles.lead}>This unit has no flash cards.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const goTo = (next: number) => {
    setIndex(next);
    setFlipped(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Review cards</Text>
          <Text style={styles.title}>{pack.meta.title}</Text>
          <Text style={styles.progress}>
            {safeIndex + 1} / {cards.length}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            flipped
              ? `Back: ${card.back}. Tap to show front`
              : `Front: ${card.front}. Tap to flip`
          }
          onPress={() => setFlipped((v) => !v)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <Text style={styles.sideLabel}>{flipped ? 'Back' : 'Front'}</Text>
          <Text style={styles.cardText}>{flipped ? card.back : card.front}</Text>
          <Text style={styles.tapHint}>{flipped ? 'Tap to hide' : 'Tap to flip'}</Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous card"
            disabled={safeIndex === 0}
            onPress={() => goTo(safeIndex - 1)}
            style={({ pressed }) => [
              styles.secondary,
              safeIndex === 0 && styles.disabled,
              pressed && safeIndex > 0 && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>Previous</Text>
          </Pressable>
          {safeIndex < cards.length - 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next card"
              onPress={() => goTo(safeIndex + 1)}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done reviewing cards"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>Done</Text>
            </Pressable>
          )}
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  },
  progress: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.subtle,
  },
  missing: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  sideLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 30,
    color: colors.text,
  },
  tapHint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  primary: {
    flex: 1,
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
  secondary: {
    flex: 1,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
