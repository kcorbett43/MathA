import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type DrillTimerProps = {
  totalSeconds: number;
  /** Bumps to restart the countdown (Reset). */
  runId: number;
  onTimeUp: () => void;
  /** When true, ignore further ticks / time-up (abandoned or finished). */
  isStopped: () => boolean;
};

/**
 * Isolated so per-second ticks do not re-render the keypad / answer field.
 */
function DrillTimerComponent({
  totalSeconds,
  runId,
  onTimeUp,
  isStopped,
}: DrillTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    const id = setInterval(() => {
      if (isStopped()) {
        clearInterval(id);
        return;
      }
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [runId, totalSeconds, isStopped]);

  useEffect(() => {
    if (secondsLeft !== 0 || isStopped()) return;
    onTimeUp();
  }, [secondsLeft, onTimeUp, isStopped]);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeLabel = `${minutes}:${String(secs).padStart(2, '0')}`;

  return (
    <View style={styles.block}>
      <Text style={styles.label}>Time</Text>
      <Text style={[styles.value, secondsLeft <= 10 && styles.urgent]}>{timeLabel}</Text>
    </View>
  );
}

export const DrillTimer = memo(DrillTimerComponent);

const styles = StyleSheet.create({
  block: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  urgent: {
    color: colors.danger,
  },
});
