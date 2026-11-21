import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [runId, setRunId] = useState(0);

  const finishedRef = useRef(false);
  const answerRef = useRef('');
  const questionRef = useRef(question);
  const secondsLeftRef = useRef(secondsLeft);
  const correctCountRef = useRef(correctCount);

  questionRef.current = question;
  secondsLeftRef.current = secondsLeft;
  correctCountRef.current = correctCount;

  // Any leave without an explicit finish (Home / header back) abandons scoring.
  useEffect(() => {
    return () => {
      finishedRef.current = true;
    };
  }, []);

  // Timer restarts cleanly when runId changes (initial mount + Reset).
  useEffect(() => {
    finishedRef.current = false;
    setSecondsLeft(totalSeconds);
    secondsLeftRef.current = totalSeconds;

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          secondsLeftRef.current = 0;
          return 0;
        }
        const next = prev - 1;
        secondsLeftRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [runId, totalSeconds]);

  useEffect(() => {
    if (secondsLeft > 0 || finishedRef.current) return;
    finishedRef.current = true;
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    router.replace({
      pathname: '/results',
      params: {
        correct: String(correctCountRef.current),
        attempted: String(correctCountRef.current),
        duration: String(durationMinutes),
        mode,
        sessionId,
      },
    });
  }, [secondsLeft, durationMinutes, mode]);

  function commitAnswer(next: string) {
    if (secondsLeftRef.current === 0 || finishedRef.current) return;

    // OpenQuant-style: exact string match advances immediately.
    if (next !== '' && next === questionRef.current.answer) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
      answerRef.current = '';
      setAnswer('');
      const nextQuestion = generateQuestion(mode);
      questionRef.current = nextQuestion;
      setQuestion(nextQuestion);
      return;
    }

    answerRef.current = next;
    setAnswer(next);
  }

  function appendDigit(digit: string) {
    const current = answerRef.current;
    let next = current;
    if (current === '0') next = digit;
    else if (current === '-0') next = `-${digit}`;
    else if (current.replace('-', '').length >= MAX_ANSWER_LEN) next = current;
    else next = current + digit;
    commitAnswer(next);
  }

  function toggleMinus() {
    const current = answerRef.current;
    commitAnswer(current.startsWith('-') ? current.slice(1) : `-${current}`);
  }

  function backspace() {
    commitAnswer(answerRef.current.slice(0, -1));
  }

  function resetDrill() {
    // Restart in place — do not navigate to results / do not log a score.
    finishedRef.current = true; // block any in-flight timer completion briefly
    answerRef.current = '';
    setAnswer('');
    setCorrectCount(0);
    correctCountRef.current = 0;
    const nextQuestion = generateQuestion(mode);
    questionRef.current = nextQuestion;
    setQuestion(nextQuestion);
    setRunId((n) => n + 1); // remounts timer effect; clears finishedRef
  }

  function goHome() {
    // Abandon without logging a score.
    finishedRef.current = true;
    router.replace('/');
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
          <View style={styles.actionsCol}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go home"
              onPress={goHome}
              hitSlop={8}
              style={({ pressed }) => [styles.chipBtn, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipText}>Home</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset drill"
              onPress={resetDrill}
              hitSlop={8}
              style={({ pressed }) => [styles.chipBtn, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipText}>Reset</Text>
            </Pressable>
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
          onBackspace={backspace}
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
    alignItems: 'flex-start',
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
  actionsCol: {
    gap: 6,
    alignItems: 'stretch',
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  chipPressed: {
    backgroundColor: colors.chip,
  },
  chipText: {
    fontSize: 14,
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
