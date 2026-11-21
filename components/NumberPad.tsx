import { memo, useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';

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

const BOTTOM_ROW = (allowNegative: boolean): (KeyId | null)[] => [
  allowNegative ? 'minus' : null,
  '0',
  'backspace',
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
 * Root cause of dropped rapid taps: RN Pressable/Pressability is a one-touch
 * state machine. A second tap that begins before the first press cycle ends
 * is rejected (responder exclusivity). onPress is worse (waits for release).
 *
 * Fix: fire on every touch *start* via View.onTouchStart (native) and
 * touchstart/pointerdown (web) — no Pressable, no capture hacks that lock.
 */
function NumberPadComponent({
  onDigit,
  onBackspace,
  onMinus,
  allowNegative = true,
}: NumberPadProps) {
  const handlersRef = useRef({ onDigit, onBackspace, onMinus });
  handlersRef.current = { onDigit, onBackspace, onMinus };

  const activate = useCallback((key: KeyId) => {
    const h = handlersRef.current;
    if (key === 'backspace') h.onBackspace();
    else if (key === 'minus') h.onMinus?.();
    else h.onDigit(key);
  }, []);

  if (Platform.OS === 'web') {
    return <WebPad allowNegative={allowNegative} onActivate={activate} />;
  }

  return <NativePad allowNegative={allowNegative} onActivate={activate} />;
}

export const NumberPad = memo(NumberPadComponent);

/* ---------------- Native: onTouchStart per key (no Pressable) ---------------- */

function NativePad({
  allowNegative,
  onActivate,
}: {
  allowNegative: boolean;
  onActivate: (key: KeyId) => void;
}) {
  return (
    <View style={styles.pad}>
      {DIGIT_ROWS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <NativeKey key={key} id={key} onActivate={onActivate} />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {BOTTOM_ROW(allowNegative).map((key, i) =>
          key ? (
            <NativeKey key={key} id={key} onActivate={onActivate} />
          ) : (
            <View key={`spacer-${i}`} style={[styles.key, styles.mutedKey]} />
          ),
        )}
      </View>
    </View>
  );
}

function NativeKey({
  id,
  onActivate,
}: {
  id: KeyId;
  onActivate: (key: KeyId) => void;
}) {
  const [pressed, setPressed] = useState(false);
  // Track which touch ids already activated this key this contact — not a debounce
  // across taps; cleared on touch end so a second tap always fires.
  const activeTouches = useRef<Set<number>>(new Set());

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yFor(id)}
      style={[styles.key, pressed && styles.keyPressed]}
      onTouchStart={(e) => {
        const touch = e.nativeEvent.changedTouches[0];
        if (!touch) return;
        const tid = touch.identifier;
        if (activeTouches.current.has(tid)) return;
        activeTouches.current.add(tid);
        setPressed(true);
        onActivate(id);
      }}
      onTouchEnd={(e) => {
        for (const t of e.nativeEvent.changedTouches) {
          activeTouches.current.delete(t.identifier);
        }
        if (activeTouches.current.size === 0) setPressed(false);
      }}
      onTouchCancel={(e) => {
        for (const t of e.nativeEvent.changedTouches) {
          activeTouches.current.delete(t.identifier);
        }
        if (activeTouches.current.size === 0) setPressed(false);
      }}
    >
      <Text style={styles.keyText}>{labelFor(id)}</Text>
    </View>
  );
}

/* ---------------- Web: touchstart per contact (iOS Safari safe) ------------- */

function WebPad({
  allowNegative,
  onActivate,
}: {
  allowNegative: boolean;
  onActivate: (key: KeyId) => void;
}) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  // Per-touch-identifier: one activation per finger contact, then clear on end.
  // A new tap = new touchstart → always activates (same key twice is fine).
  const liveTouches = useRef<Set<number>>(new Set());

  // Attach non-passive touch listeners so preventDefault works on iOS Safari.
  const cleanupRef = useRef<(() => void) | null>(null);

  const setPadRef = useCallback((node: HTMLDivElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    padRef.current = node;
    liveTouches.current.clear();
    if (!node) return;

    const keyFromEvent = (target: EventTarget | null): KeyId | null => {
      const el = target instanceof Element ? target.closest('[data-key]') : null;
      return (el?.getAttribute('data-key') as KeyId | null) ?? null;
    };

    const onTouchStart = (e: TouchEvent) => {
      const key = keyFromEvent(e.target);
      if (!key) return;
      // Prevent iOS synthetic mouse/click and double-tap-zoom eating the next tap.
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches.item(i);
        if (!t) continue;
        if (liveTouches.current.has(t.identifier)) continue;
        liveTouches.current.add(t.identifier);
        onActivateRef.current(key);
      }
    };

    const clearTouches = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches.item(i);
        if (t) liveTouches.current.delete(t.identifier);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      // Mouse / pen only — touch is handled above (avoids double-fire).
      if (e.pointerType === 'touch') return;
      const key = keyFromEvent(e.target);
      if (!key) return;
      e.preventDefault();
      onActivateRef.current(key);
    };

    node.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    node.addEventListener('touchend', clearTouches, { capture: true });
    node.addEventListener('touchcancel', clearTouches, { capture: true });
    node.addEventListener('pointerdown', onPointerDown, { capture: true });

    cleanupRef.current = () => {
      node.removeEventListener('touchstart', onTouchStart, true);
      node.removeEventListener('touchend', clearTouches, true);
      node.removeEventListener('touchcancel', clearTouches, true);
      node.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  return (
    <div ref={setPadRef} role="group" aria-label="Number pad" style={webPadStyle}>
      {DIGIT_ROWS.map((row) => (
        <div key={row.join('-')} style={webRowStyle}>
          {row.map((key) => (
            <WebKey key={key} id={key} />
          ))}
        </div>
      ))}
      <div style={webRowStyle}>
        {BOTTOM_ROW(allowNegative).map((key, i) =>
          key ? <WebKey key={key} id={key} /> : <div key={`spacer-${i}`} style={webSpacerStyle} />,
        )}
      </div>
    </div>
  );
}

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
