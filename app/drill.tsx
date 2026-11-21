import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NumberPad } from '@/components/NumberPad';
import { generateQuestion } from '@/lib/generators';
import { colors } from '@/lib/theme';
import {
  modeLabel,
  type DurationMinutes,
  type GameMode,
  type Question,
} from '@/lib/types';

function parseMode(raw: string | string[] | undefined): GameMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'arithmeticPro' || value === 'sequence' || value === 'arithmetic') {
    return value;
  }
  return 'arithmetic';
}

function parseDuration(raw: string | string[] | undefined): DurationMinutes {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? '2', 10);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return 2;
}

const MAX_ANSWER_LEN = 10;

export default function DrillScreen() {
  const params = useLocalSearchParams<{ mode?: string; duration?: string }>();
  const mode = useMemo(() => parseMode(params.mode), [params.mode]);
  const durationMinutes = useMemo(
    () => parseDuration(params.duration),
    [params.duration],
  );
  const totalSeconds = durationMinutes * 60;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [question, setQuestion] = useState<Question>(() => generateQuestion(mode));
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
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    router.replace({
      pathname: '/results',
      params: {
        correct: String(correctCount),
        attempted: String(attemptedCount),
        duration: String(durationMinutes),
        mode,
        sessionId,
      },
    });
  }, [secondsLeft, correctCount, attemptedCount, durationMinutes, mode]);

  function appendDigit(digit: string) {
    setAnswer((prev) => {
      if (prev === '0') return digit;
      if (prev === '-0') return `-${digit}`;
      if (prev.replace('-', '').length >= MAX_ANSWER_LEN) return prev;
      return prev + digit;
    });
  }

  function toggleMinus() {
    setAnswer((prev) => {
      if (prev.startsWith('-')) return prev.slice(1);
      return `-${prev}`;
    });
  }

  function submitAnswer() {
    if (!answer || answer === '-' || secondsLeft === 0) return;

    // Product scope: submit advances; only correct increments score.
    const isCorrect = answer === question.answer;
    setAttemptedCount((n) => n + 1);
    if (isCorrect) {
      setCorrectCount((n) => n + 1);
    }

    setAnswer('');
    setQuestion(generateQuestion(mode));
  }

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeLabel = `${minutes}:${String(secs).padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Time</Text>
            <Text style={[styles.metaValue, secondsLeft <= 10 && styles.urgent]}>
              {timeLabel}
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Score</Text>
            <Text style={styles.metaValue}>{correctCount}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Mode</Text>
            <Text style={styles.metaMode} numberOfLines={1}>
              {modeLabel(mode)}
            </Text>
          </View>
        </View>

        <View style={styles.promptBlock}>
          <Text
            style={[
              styles.prompt,
              mode === 'arithmeticPro' && styles.promptPro,
              mode === 'sequence' && styles.promptSequence,
            ]}
          >
            {question.prompt}
          </Text>
          <View style={styles.answerBox}>
            <Text style={styles.answerText}>{answer || ' '}</Text>
          </View>
        </View>

        <NumberPad
          allowNegative
          onDigit={appendDigit}
          onMinus={toggleMinus}
          onBackspace={() => setAnswer((prev) => prev.slice(0, -1))}
          onSubmit={submitAnswer}
          submitDisabled={!answer || answer === '-' || secondsLeft === 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
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
    justifyContent: 'space-between',
    gap: 8,
  },
  metaBlock: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  metaMode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  urgent: {
    color: colors.danger,
  },
  promptBlock: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 16,
  },
  prompt: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
  },
  promptPro: {
    fontSize: 28,
    lineHeight: 36,
  },
  promptSequence: {
    fontSize: 26,
    lineHeight: 34,
  },
  answerBox: {
    minWidth: 160,
    minHeight: 56,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  answerText: {
    fontSize: 36,
    fontWeight: '600',
    color: colors.text,
  },
});
