import { StyleSheet, Text, View } from 'react-native';

import type { PackCard } from '@/content/packs';
import { colors } from '@/lib/theme';

type Props = {
  card: PackCard;
};

/**
 * Inline lesson rendering for a flash card — callout / definition style
 * (front as term, back as body). Flip study lives on the Review cards screen.
 */
export function LessonCardBlock({ card }: Props) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${card.front}. ${card.back}`}
      style={styles.block}
    >
      <Text style={styles.kicker}>Card</Text>
      <Text style={styles.front}>{card.front}</Text>
      <Text style={styles.back}>{card.back}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  front: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  back: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.subtle,
  },
});
