import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type Chip<T extends string | number> = {
  id: T;
  label: string;
};

type ChipRowProps<T extends string | number> = {
  chips: Chip<T>[];
  selected: T;
  onSelect: (id: T) => void;
  accessibilityPrefix?: string;
};

export function ChipRow<T extends string | number>({
  chips,
  selected,
  onSelect,
  accessibilityPrefix = 'Option',
}: ChipRowProps<T>) {
  return (
    <View style={styles.row}>
      {chips.map((chip) => {
        const isSelected = chip.id === selected;
        return (
          <Pressable
            key={String(chip.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${accessibilityPrefix} ${chip.label}`}
            onPress={() => onSelect(chip.id)}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#E8F0FE',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.subtle,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
