import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type NumberPadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onMinus?: () => void;
  /** Show ± / minus key (integer answers that may be negative). */
  allowNegative?: boolean;
  submitDisabled?: boolean;
};

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

export function NumberPad({
  onDigit,
  onBackspace,
  onSubmit,
  onMinus,
  allowNegative = true,
  submitDisabled = false,
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
          <Key label=" " accessibilityLabel="Empty" onPress={() => {}} muted />
        )}
        <Key label="0" accessibilityLabel="Digit 0" onPress={() => onDigit('0')} />
        <Key label="⌫" accessibilityLabel="Backspace" onPress={onBackspace} />
      </View>

      <Key
        label="Submit"
        accessibilityLabel="Submit answer"
        onPress={onSubmit}
        disabled={submitDisabled}
        primary
        wide
      />
    </View>
  );
}

type KeyProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  muted?: boolean;
  wide?: boolean;
};

function Key({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  primary = false,
  muted = false,
  wide = false,
}: KeyProps) {
  if (muted) {
    return <View style={[styles.key, styles.mutedKey, wide && styles.wide]} />;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        wide && styles.wide,
        primary && styles.submitKey,
        disabled && styles.disabledKey,
        pressed && !disabled && styles.keyPressed,
      ]}
    >
      <Text
        style={[
          styles.keyText,
          primary && styles.submitKeyText,
          disabled && styles.disabledKeyText,
          wide && styles.wideText,
        ]}
      >
        {label}
      </Text>
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
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: {
    flex: undefined,
    width: '100%',
    minHeight: 52,
  },
  mutedKey: {
    backgroundColor: 'transparent',
  },
  submitKey: {
    backgroundColor: colors.primary,
  },
  disabledKey: {
    opacity: 0.45,
  },
  keyPressed: {
    opacity: 0.75,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  wideText: {
    fontSize: 18,
  },
  submitKeyText: {
    color: '#FFFFFF',
  },
  disabledKeyText: {
    color: '#FFFFFF',
  },
});
