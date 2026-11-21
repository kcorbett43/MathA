import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SESSION_DURATION_SECONDS } from '@/lib/math';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.brand}>MathA</Text>
          <Text style={styles.tagline}>Mental math drills you can run anywhere.</Text>
          <Text style={styles.detail}>
            {SESSION_DURATION_SECONDS}s timed session · addition, subtraction, and multiplication
          </Text>
        </View>

        <Link href="/drill" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start drill"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>Start drill</Text>
          </Pressable>
        </Link>
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
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
  },
  brand: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    color: '#1A1D21',
  },
  tagline: {
    fontSize: 20,
    lineHeight: 28,
    color: '#3A4149',
    maxWidth: 320,
  },
  detail: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B737C',
    marginTop: 4,
  },
  cta: {
    backgroundColor: '#1F6FEB',
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
