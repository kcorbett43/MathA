import { memo, useCallback, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/lib/theme';

type NumberPadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onMinus?: () => void;
  allowNegative?: boolean;
};

type KeyId = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'minus' | 'backspace';

const DIGIT_ROWS: KeyId[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

function labelFor(id: KeyId): string {
  if (id === 'minus') return '−';
  if (id === 'backspace') return '⌫';
  return id;
}

function a11yFor(id: KeyId): string {
  if (id === 'minus') return 'Negative sign';
  if (id === 'backspace') return 'Backspace';
  return `Digit ${id}`;
}

/**
 * Number pad that registers every consecutive tap.
 * - Web: capture-phase pointerdown on a stable parent (no per-key React handler churn / gesture lock)
 * - Native: Pressable onPress (not onPressIn — RN touch responder often drops the 2nd rapid tap)
 */
function NumberPadComponent({
  onDigit,
  onBackspace,
  onMinus,
  allowNegative = true,
}: NumberPadProps) {
  const handlersRef = useRef({ onDigit, onBackspace, onMinus });
  handlersRef.current = { onDigit, onBackspace, onMinus };

  // Suppress only browser ghost duplicates of the *same* pointer — never debounce distinct taps.
  const lastPtrRef = useRef<{ pointerId: number; key: KeyId; t: number } | null>(null);

  const activate = useCallback((key: KeyId, pointerId = -1) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const last = lastPtrRef.current;
    if (
      last &&
      pointerId !== -1 &&
      last.pointerId === pointerId &&
      last.key === key &&
      now - last.t < 16
    ) {
      return;
    }
    lastPtrRef.current = { pointerId, key, t: now };

    const h = handlersRef.current;
    if (key === 'backspace') h.onBackspace();
    else if (key === 'minus') h.onMinus?.();
    else h.onDigit(key);
  }, []);

  const onWebPointerDown = useCallback(
    (e: { target: EventTarget | null; pointerId: number; preventDefault: () => void }) => {
      const el =
        e.target instanceof Element ? e.target.closest('[data-key]') : null;
      const key = el?.getAttribute('data-key') as KeyId | null | undefined;
      if (!key) return;
      e.preventDefault();
      activate(key, e.pointerId);
    },
    [activate],
  );

  if (Platform.OS === 'web') {
    return (
      <div
        role="group"
        aria-label="Number pad"
        onPointerDown={onWebPointerDown as never}
        style={webPadStyle}
      >
        {DIGIT_ROWS.map((row) => (
          <div key={row.join('-')} style={webRowStyle}>
            {row.map((key) => (
              <WebKey key={key} id={key} />
            ))}
          </div>
        ))}
        <div style={webRowStyle}>
          {allowNegative ? <WebKey id="minus" /> : <div style={webSpacerStyle} />}
          <WebKey id="0" />
          <WebKey id="backspace" />
        </div>
      </div>
    );
  }

  return (
    <View style={styles.pad}>
      {DIGIT_ROWS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <NativeKey key={key} id={key} onActivate={activate} />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {allowNegative ? (
          <NativeKey id="minus" onActivate={activate} />
        ) : (
          <View style={[styles.key, styles.mutedKey]} />
        )}
        <NativeKey id="0" onActivate={activate} />
        <NativeKey id="backspace" onActivate={activate} />
      </View>
    </View>
  );
}

export const NumberPad = memo(NumberPadComponent);

function WebKey({ id }: { id: KeyId }) {
  return (
    <div
      data-key={id}
      role="button"
      aria-label={a11yFor(id)}
      tabIndex={0}
      style={webKeyStyle}
    >
      {labelFor(id)}
    </div>
  );
}

function NativeKey({
  id,
  onActivate,
}: {
  id: KeyId;
  onActivate: (key: KeyId) => void;
}) {
  // Use onPress (release) — onPressIn + rapid re-taps often hit RN's
  // "Cannot find single active touch" and drop the second press.
  const onPress = useCallback(
    (_e: GestureResponderEvent) => {
      onActivate(id);
    },
    [id, onActivate],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yFor(id)}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={styles.keyText}>{labelFor(id)}</Text>
    </Pressable>
  );
}

const webPadStyle: Record<string, string | number> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: '100%',
  touchAction: 'manipulation',
  WebkitUserSelect: 'none',
  userSelect: 'none',
};

const webRowStyle: Record<string, string | number> = {
  display: 'flex',
  flexDirection: 'row',
  gap: 8,
  width: '100%',
};

const webKeyStyle: Record<string, string | number> = {
  flex: 1,
  minHeight: 56,
  borderRadius: 12,
  background: colors.chip,
  color: colors.text,
  fontSize: 24,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
};

const webSpacerStyle: Record<string, string | number> = {
  flex: 1,
  minHeight: 56,
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
  } satisfies ViewStyle,
  mutedKey: {
    backgroundColor: 'transparent',
  },
  keyPressed: {
    backgroundColor: '#D8DEE6',
    transform: [{ scale: 0.97 }],
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
});
