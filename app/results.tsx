import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function asNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}

export default function ResultsScreen() {
  const params = useLocalSearchParams<{
    correct?: string;
    attempted?: string;
    duration?: string;
  }>();

  const correct = asNumber(params.correct);
  const attempted = asNumber(params.attempted);
  const duration = asNumber(params.duration) || 60;
  const accuracy = attempted === 0 ? 0 : Math.round((correct / attempted) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.summary}>
          <Text style={styles.title}>Session complete</Text>
          <Text style={styles.subtitle}>{duration}s drill</Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{correct}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{attempted}</Text>
              <Text style={styles.statLabel}>Attempted</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Link href="/drill" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          </Link>
          <Link href="/" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Back home</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  summary: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1D21',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B737C',
    marginBottom: 24,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1D21',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B737C',
  },
  actions: {
    gap: 12,
  },
  primary: {
    backgroundColor: '#1F6FEB',
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DB',
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryText: {
    color: '#1A1D21',
    fontSize: 18,
    fontWeight: '600',
  },
});
