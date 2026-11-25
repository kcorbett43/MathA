import { memo, useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type ViewInstance,
  type ViewStyle,
} from 'react-native';

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

const KEY_REST_BG = colors.chip;
const KEY_PRESSED_BG = '#D8DEE6';

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
 * Touch path for Expo Go / native:
 * - Fire on touch *start* (same immediacy as onPressIn; not delayed onPress).
 * - Use View onTouch* — not Pressable. Pressable’s Pressability claims the
 *   responder and holding one key locks out other keys / overlapping taps.
 * - Press visuals via setNativeProps (no React setState per key, no scale).
 *
 * Web keeps pointer/touch-start listeners (already feels snappy there).
 */
function NumberPadComponent({
  onDigit,
  onBackspace,
  onMinus,
  onSlash,
  allowNegative = true,
  allowFraction = false,
}: NumberPadProps) {
  const handlersRef = useRef({ onDigit, onBackspace, onMinus, onSlash });
  useEffect(() => {
    handlersRef.current = { onDigit, onBackspace, onMinus, onSlash };
  }, [onDigit, onBackspace, onMinus, onSlash]);

  const activate = useCallback((key: KeyId) => {
    const h = handlersRef.current;
    if (key === 'backspace') h.onBackspace();
    else if (key === 'minus') h.onMinus?.();
    else if (key === 'slash') h.onSlash?.();
    else h.onDigit(key);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <WebPad
        allowNegative={allowNegative}
        allowFraction={allowFraction}
        onActivate={activate}
      />
    );
  }

  return (
    <NativePad
      allowNegative={allowNegative}
      allowFraction={allowFraction}
      onActivate={activate}
    />
  );
}

export const NumberPad = memo(NumberPadComponent);

/* -------- Native: per-key onTouchStart (no Pressable responder lock) -------- */

function NativePad({
  allowNegative,
  allowFraction,
  onActivate,
}: {
  allowNegative: boolean;
  allowFraction: boolean;
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
        {BOTTOM_ROW({ allowNegative, allowFraction }).map((key, i) =>
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

const NativeKey = memo(function NativeKey({
  id,
  onActivate,
}: {
  id: KeyId;
  onActivate: (key: KeyId) => void;
}) {
  const visualRef = useRef<ViewInstance>(null);
  // Per-finger ids on this key only — holding one key must not block siblings.
  const activeTouches = useRef<Set<number>>(new Set());

  const paintPressed = (pressed: boolean) => {
    visualRef.current?.setNativeProps({
      style: {
        backgroundColor: pressed ? KEY_PRESSED_BG : KEY_REST_BG,
        // Opacity-only flash — avoid transform/scale layout work on the hot path.
        opacity: pressed ? 0.92 : 1,
      },
    });
  };

  return (
    <View
      ref={visualRef}
      // Keep a real host view on Android so setNativeProps always hits this node.
      collapsable={false}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yFor(id)}
      style={[styles.keyHit, styles.key]}
      onTouchStart={(e) => {
        // Fire on finger-down (onPressIn timing) without claiming the RN responder,
        // so overlapping / multi-key presses still reach other keys.
        // changedTouches is shared by every key hit in the same native touch batch;
        // only touches also in targetTouches landed on this key. Fabric sends
        // targetTouches but RN's NativeTouchEvent type omits it.
        const { changedTouches, targetTouches } = e.nativeEvent as typeof e.nativeEvent & {
          targetTouches?: readonly { identifier: number }[];
        };
        const mine = targetTouches && new Set(targetTouches.map((t) => t.identifier));
        for (const touch of changedTouches) {
          const tid = touch.identifier;
          if (mine && !mine.has(tid)) continue;
          if (activeTouches.current.has(tid)) continue;
          activeTouches.current.add(tid);
          paintPressed(true);
          onActivate(id);
        }
      }}
      onTouchEnd={(e) => {
        for (const t of e.nativeEvent.changedTouches) {
          activeTouches.current.delete(t.identifier);
        }
        if (activeTouches.current.size === 0) paintPressed(false);
      }}
      onTouchCancel={(e) => {
        for (const t of e.nativeEvent.changedTouches) {
          activeTouches.current.delete(t.identifier);
        }
        if (activeTouches.current.size === 0) paintPressed(false);
      }}
    >
      <Text style={styles.keyText} pointerEvents="none">
        {labelFor(id)}
      </Text>
    </View>
  );
});

/* ---------------- Web: touchstart per contact (iOS Safari safe) ------------- */

function WebPad({
  allowNegative,
  allowFraction,
  onActivate,
}: {
  allowNegative: boolean;
  allowFraction: boolean;
  onActivate: (key: KeyId) => void;
}) {
  const onActivateRef = useRef(onActivate);
  useEffect(() => {
    onActivateRef.current = onActivate;
  }, [onActivate]);

  // Per-touch-identifier: one activation per finger contact, then clear on end.
  // A new tap = new touchstart → always activates (same key twice is fine).
  const liveTouches = useRef<Set<number>>(new Set());

  // Attach non-passive touch listeners so preventDefault works on iOS Safari.
  const cleanupRef = useRef<(() => void) | null>(null);

  const setPadRef = useCallback((node: HTMLDivElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
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
        {BOTTOM_ROW({ allowNegative, allowFraction }).map((key, i) =>
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
  keyHit: {
    flex: 1,
  },
  key: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  mutedKey: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
});
