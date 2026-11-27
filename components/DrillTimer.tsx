import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type DrillTimerProps = {
  totalSeconds: number;
  /** Bumps to restart the session clock after countdown / Reset. */
  runId: number;
  /** False during the 3-2-1 intro — clock stays frozen and does not tick. */
  active: boolean;
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
  active,
  onTimeUp,
  isStopped,
}: DrillTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    if (!active) return;

    const deadline = Date.now() + totalSeconds * 1000;
    const id = setInterval(() => {
      if (isStopped()) {
        clearInterval(id);
        return;
      }
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [runId, totalSeconds, active, isStopped]);

  useEffect(() => {
    if (!active || secondsLeft !== 0 || isStopped()) return;
    onTimeUp();
  }, [secondsLeft, onTimeUp, isStopped, active]);

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

export const DrillTimer = memo(function DrillTimer(props: DrillTimerProps) {
  return <DrillTimerComponent key={`${props.runId}-${props.active}-${props.totalSeconds}`} {...props} />;
});

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
