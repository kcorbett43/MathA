import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type NumberPadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onMinus?: () => void;
  /** Show ± / minus key (integer answers that may be negative). */
  allowNegative?: boolean;
};

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

export function NumberPad({
  onDigit,
  onBackspace,
  onMinus,
  allowNegative = true,
}: NumberPadProps) {
  return (
    <View style={styles.pad}>
      {DIGIT_ROWS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <Key
              key={key}
              label={key}
              accessibilityLabel={`Digit ${key}`}
              onPress={() => onDigit(key)}
            />
          ))}
        </View>
      ))}

      <View style={styles.row}>
        {allowNegative ? (
          <Key
            label="−"
            accessibilityLabel="Negative sign"
            onPress={() => onMinus?.()}
          />
        ) : (
          <View style={[styles.key, styles.mutedKey]} />
        )}
        <Key label="0" accessibilityLabel="Digit 0" onPress={() => onDigit('0')} />
        <Key label="⌫" accessibilityLabel="Backspace" onPress={onBackspace} />
      </View>
    </View>
  );
}

type KeyProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

function Key({ label, accessibilityLabel, onPress }: KeyProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedKey: {
    backgroundColor: 'transparent',
  },
  keyPressed: {
    opacity: 0.75,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
});
