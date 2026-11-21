import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NumberPad } from '@/components/NumberPad';
import {
  SESSION_DURATION_SECONDS,
  generateQuestion,
  type Question,
} from '@/lib/math';

export default function DrillScreen() {
  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION_SECONDS);
  const [question, setQuestion] = useState<Question>(() => generateQuestion());
  const [answer, setAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0 || finishedRef.current) return;
    finishedRef.current = true;
    router.replace({
      pathname: '/results',
      params: {
        correct: String(correctCount),
        attempted: String(attemptedCount),
        duration: String(SESSION_DURATION_SECONDS),
      },
    });
  }, [secondsLeft, correctCount, attemptedCount]);

  function submitAnswer() {
    if (!answer || secondsLeft === 0) return;

    const numeric = Number.parseInt(answer, 10);
    const isCorrect = numeric === question.answer;

    setAttemptedCount((n) => n + 1);
    if (isCorrect) {
      setCorrectCount((n) => n + 1);
    }

    setAnswer('');
    setQuestion(generateQuestion());
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Time</Text>
          <Text style={[styles.metaValue, secondsLeft <= 10 && styles.urgent]}>
            {secondsLeft}s
          </Text>
          <Text style={styles.metaLabel}>Score</Text>
          <Text style={styles.metaValue}>
            {correctCount}/{attemptedCount}
          </Text>
        </View>

        <View style={styles.promptBlock}>
          <Text style={styles.prompt}>{question.prompt}</Text>
          <View style={styles.answerBox}>
            <Text style={styles.answerText}>{answer || ' '}</Text>
          </View>
        </View>

        <NumberPad
          onDigit={(digit) => {
            if (answer.length >= 4) return;
            setAnswer((prev) => prev + digit);
          }}
          onBackspace={() => setAnswer((prev) => prev.slice(0, -1))}
          onSubmit={submitAnswer}
          submitDisabled={!answer || secondsLeft === 0}
        />
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: '#6B737C',
    marginLeft: 8,
  },
  metaValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D21',
    minWidth: 48,
  },
  urgent: {
    color: '#C62828',
  },
  promptBlock: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 24,
  },
  prompt: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#1A1D21',
  },
  answerBox: {
    minWidth: 160,
    minHeight: 56,
    borderBottomWidth: 2,
    borderBottomColor: '#1F6FEB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  answerText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#1A1D21',
  },
});
