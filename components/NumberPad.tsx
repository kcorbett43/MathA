import { memo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/lib/theme';

type NumberPadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onMinus?: () => void;
  allowNegative?: boolean;
};

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

function NumberPadComponent({
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
              onActivate={() => onDigit(key)}
            />
          ))}
        </View>
      ))}

      <View style={styles.row}>
        {allowNegative ? (
          <Key
            label="−"
            accessibilityLabel="Negative sign"
            onActivate={() => onMinus?.()}
          />
        ) : (
          <View style={[styles.key, styles.mutedKey]} />
        )}
        <Key label="0" accessibilityLabel="Digit 0" onActivate={() => onDigit('0')} />
        <Key label="⌫" accessibilityLabel="Backspace" onActivate={onBackspace} />
      </View>
    </View>
  );
}

export const NumberPad = memo(NumberPadComponent);

type KeyProps = {
  label: string;
  accessibilityLabel: string;
  onActivate: () => void;
};

function Key({ label, accessibilityLabel, onActivate }: KeyProps) {
  // Web: pointerdown updates on finger/mouse down (avoids RN-web touch lag/bugs).
  if (Platform.OS === 'web') {
    return (
      <View style={styles.key}>
        <button
          type="button"
          aria-label={accessibilityLabel}
          onPointerDown={(e) => {
            e.preventDefault();
            onActivate();
          }}
          style={webKeyStyle}
        >
          {label}
        </button>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={onActivate}
      hitSlop={4}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

const webKeyStyle = {
  width: '100%',
  height: '100%',
  minHeight: 56,
  margin: 0,
  border: 'none',
  borderRadius: 12,
  background: colors.chip,
  color: colors.text,
  fontSize: 24,
  fontWeight: 600,
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none' as const,
};

const styles = StyleSheet.create({
  pad: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } satisfies ViewStyle,
  mutedKey: {
    backgroundColor: 'transparent',
  },
  keyPressed: {
    backgroundColor: '#D8DEE6',
    transform: [{ scale: 0.96 }],
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
});
