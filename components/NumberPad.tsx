import { Pressable, StyleSheet, Text, View } from 'react-native';

type NumberPadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
};

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['⌫', '0', '↵'],
] as const;

export function NumberPad({
  onDigit,
  onBackspace,
  onSubmit,
  submitDisabled = false,
}: NumberPadProps) {
  return (
    <View style={styles.pad}>
      {KEYS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => {
            const isSubmit = key === '↵';
            const isBackspace = key === '⌫';
            const disabled = isSubmit && submitDisabled;

            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={
                  isSubmit ? 'Submit answer' : isBackspace ? 'Backspace' : `Digit ${key}`
                }
                disabled={disabled}
                onPress={() => {
                  if (isSubmit) onSubmit();
                  else if (isBackspace) onBackspace();
                  else onDigit(key);
                }}
                style={({ pressed }) => [
                  styles.key,
                  isSubmit && styles.submitKey,
                  disabled && styles.disabledKey,
                  pressed && !disabled && styles.keyPressed,
                ]}
              >
                <Text
                  style={[
                    styles.keyText,
                    isSubmit && styles.submitKeyText,
                    disabled && styles.disabledKeyText,
                  ]}
                >
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
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
    backgroundColor: '#EEF1F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitKey: {
    backgroundColor: '#1F6FEB',
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
    color: '#1A1D21',
  },
  submitKeyText: {
    color: '#FFFFFF',
  },
  disabledKeyText: {
    color: '#FFFFFF',
  },
});
