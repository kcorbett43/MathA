import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { NumberPad } from '@/components/NumberPad';
import type { AnswerType, ChoiceOption } from '@/content/packs/types';
import { colors } from '@/lib/theme';

const MAX_ANSWER_LEN = 12;

type Props = {
  answerType: AnswerType;
  choices?: ChoiceOption[];
  value: string;
  /** For multiChoice — selected option ids joined or tracked separately via value as comma-list. */
  selectedIds?: string[];
  onChangeText: (text: string) => void;
  onChangeSelectedIds?: (ids: string[]) => void;
  disabled?: boolean;
  /** Show Quant scratch/hint row externally; this only owns answer entry. */
  showNumberPad?: boolean;
};

/**
 * Input chrome that follows `answerType`.
 * rational/integer → NumberPad; text → keyboard; choice/multiChoice → options;
 * manual → no entry (parent owns self-mark).
 */
export function AnswerInput({
  answerType,
  choices,
  value,
  selectedIds = [],
  onChangeText,
  onChangeSelectedIds,
  disabled = false,
  showNumberPad = true,
}: Props) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  if (answerType === 'manual') {
    return null;
  }

  if (answerType === 'choice' || answerType === 'multiChoice') {
    const multi = answerType === 'multiChoice';
    return (
      <View style={styles.choiceList}>
        {(choices ?? []).map((opt) => {
          const on = multi ? selected.has(opt.id) : value === opt.id;
          return (
            <Pressable
              key={opt.id}
              accessibilityRole={multi ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: on, disabled }}
              disabled={disabled}
              onPress={() => {
                if (disabled) return;
                if (multi) {
                  const next = new Set(selected);
                  if (next.has(opt.id)) next.delete(opt.id);
                  else next.add(opt.id);
                  onChangeSelectedIds?.([...next]);
                } else {
                  onChangeText(opt.id);
                }
              }}
              style={({ pressed }) => [
                styles.choiceRow,
                on && styles.choiceOn,
                pressed && !disabled && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <View style={[styles.choiceMark, on && styles.choiceMarkOn]}>
                <Text style={styles.choiceMarkText}>{on ? '✓' : ''}</Text>
              </View>
              <Text style={styles.choiceLabel}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (answerType === 'text') {
    return (
      <TextInput
        accessibilityLabel="Answer"
        value={value}
        editable={!disabled}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Type your answer"
        placeholderTextColor={colors.muted}
        style={[styles.textInput, disabled && styles.disabled]}
      />
    );
  }

  // rational / integer — display box + optional NumberPad
  const appendDigit = (digit: string) => {
    if (disabled) return;
    const current = value;
    const body = current.replace('-', '');
    const digitCount = body.replace('/', '').length;
    if (digitCount >= MAX_ANSWER_LEN) return;
    if (current === '0') onChangeText(digit);
    else onChangeText(current + digit);
  };

  const insertSlash = () => {
    if (disabled || answerType === 'integer') return;
    if (value.includes('/') || value === '' || value === '-') return;
    onChangeText(`${value}/`);
  };

  const backspace = () => {
    if (disabled) return;
    onChangeText(value.slice(0, -1));
  };

  return (
    <View style={styles.padBlock}>
      <View style={styles.answerBox}>
        <Text style={styles.answerText}>{value || ' '}</Text>
      </View>
      {showNumberPad ? (
        <NumberPad
          allowNegative={false}
          allowFraction={answerType === 'rational'}
          onDigit={appendDigit}
          onSlash={insertSlash}
          onBackspace={backspace}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  padBlock: { gap: 12 },
  answerBox: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  answerText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  textInput: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colors.text,
  },
  choiceList: { gap: 10 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceOn: {
    borderColor: colors.primary,
    backgroundColor: colors.chip,
  },
  choiceMark: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceMarkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceMarkText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  choiceLabel: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
