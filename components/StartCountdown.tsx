import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/lib/theme';

const STEPS = [3, 2, 1] as const;
const STEP_MS = 1000;

type StartCountdownProps = {
  onComplete: () => void;
};

/**
 * Full-area 3 → 2 → 1 intro before a timed drill. ~1s per number with scale/fade.
 * Remount (via React `key`) to replay after Reset.
 */
export function StartCountdown({ onComplete }: StartCountdownProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.72);

  useEffect(() => {
    let cancelled = false;
    opacity.value = 0;
    scale.value = 0.72;

    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1.08, { duration: 280, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
    );

    const hold = setTimeout(() => {
      if (cancelled) return;
      opacity.value = withTiming(
        0,
        { duration: 160, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (!finished || cancelled) return;
          if (stepIndex >= STEPS.length - 1) {
            runOnJS(onComplete)();
          } else {
            runOnJS(setStepIndex)(stepIndex + 1);
          }
        },
      );
    }, STEP_MS - 160);

    return () => {
      cancelled = true;
      clearTimeout(hold);
    };
  }, [stepIndex, onComplete, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.wrap, animatedStyle]}
      accessibilityRole="text"
      accessibilityLabel={`Starting in ${STEPS[stepIndex]}`}
      accessibilityLiveRegion="assertive"
    >
      <Text style={styles.number}>{STEPS[stepIndex]}</Text>
      <Text style={styles.hint}>Get ready</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  number: {
    fontSize: 120,
    fontWeight: '700',
    letterSpacing: -2,
    color: colors.primary,
    lineHeight: 130,
  },
  hint: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
