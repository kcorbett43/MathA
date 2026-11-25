import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors } from '@/lib/theme';

type NumberPadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onMinus?: () => void;
  onSlash?: () => void;
  allowNegative?: boolean;
  /** Show `/` on the bottom-left (for fraction answers). Mutually preferred over minus when both set. */
  allowFraction?: boolean;
};

type KeyId =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'minus'
  | 'slash'
  | 'backspace';

const DIGIT_ROWS: KeyId[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

const BOTTOM_ROW = (opts: {
  allowNegative: boolean;
  allowFraction: boolean;
}): (KeyId | null)[] => [
  opts.allowFraction ? 'slash' : opts.allowNegative ? 'minus' : null,
  '0',
  'backspace',
];

function labelFor(id: KeyId): string {
  if (id === 'minus') return '−';
  if (id === 'slash') return '/';
  if (id === 'backspace') return '⌫';
  return id;
}

function a11yFor(id: KeyId): string {
  if (id === 'minus') return 'Negative sign';
  if (id === 'slash') return 'Fraction slash';
  if (id === 'backspace') return 'Backspace';
  return `Digit ${id}`;
}

/**
 * Plain iOS-style number pad: Pressable + onPress.
 * Same tree on native and web — no platform fork, no setNativeProps, no custom responders.
 */
export function NumberPad({
  onDigit,
  onBackspace,
  onMinus,
  onSlash,
  allowNegative = true,
  allowFraction = false,
}: NumberPadProps) {
  const activate = (key: KeyId) => {
    if (key === 'backspace') onBackspace();
    else if (key === 'minus') onMinus?.();
    else if (key === 'slash') onSlash?.();
    else onDigit(key);
  };

  return (
    <View style={styles.pad} accessibilityLabel="Number pad">
      {DIGIT_ROWS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <KeyButton key={key} id={key} onActivate={activate} />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {BOTTOM_ROW({ allowNegative, allowFraction }).map((key, i) =>
          key ? (
            <KeyButton key={key} id={key} onActivate={activate} />
          ) : (
            <View key={`spacer-${i}`} style={[styles.key, styles.mutedKey]} />
          ),
        )}
      </View>
    </View>
  );
}

function KeyButton({
  id,
  onActivate,
}: {
  id: KeyId;
  onActivate: (key: KeyId) => void;
}) {
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yFor(id)}
      android_disableSound
      onPress={() => onActivate(id)}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={styles.keyText}>{labelFor(id)}</Text>
    </Pressable>
  );
}

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
  } satisfies ViewStyle,
  keyPressed: {
    backgroundColor: '#D8DEE6',
    opacity: 0.92,
  },
  mutedKey: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
});
