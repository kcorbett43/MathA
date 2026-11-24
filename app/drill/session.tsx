import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DrillTimer } from '@/components/DrillTimer';
import { NumberPad } from '@/components/NumberPad';
import { StartCountdown } from '@/components/StartCountdown';
import { generateQuestion } from '@/lib/generators';
import { colors } from '@/lib/theme';
import {
  modeLabel,
  parseDurationMinutes,
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

const MAX_ANSWER_LEN = 10;

type Phase = 'countdown' | 'playing';

export default function DrillScreen() {
  const params = useLocalSearchParams<{ mode?: string; duration?: string }>();
  const mode = useMemo(() => parseMode(params.mode), [params.mode]);
  const durationMinutes = useMemo(
    () => parseDurationMinutes(params.duration),
    [params.duration],
  );
  const totalSeconds = durationMinutes * 60;

  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdownKey, setCountdownKey] = useState(0);
  const [timerRunId, setTimerRunId] = useState(0);
  const [question, setQuestion] = useState<Question>(() => generateQuestion(mode));
  const [answer, setAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);

  const stoppedRef = useRef(false);
  const answerRef = useRef('');
  const questionRef = useRef(question);
  const correctCountRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  questionRef.current = question;

  const isStopped = useCallback(() => stoppedRef.current, []);

  const finishSession = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    router.replace({
      pathname: '/results',
      params: {
        correct: String(correctCountRef.current),
        attempted: String(correctCountRef.current),
        duration: String(durationMinutes),
        mode: modeRef.current,
        sessionId,
      },
    });
  }, [durationMinutes]);

  const beginPlaying = useCallback(() => {
    if (stoppedRef.current) return;
    setPhase('playing');
    setTimerRunId((n) => n + 1);
  }, []);

  const commitAnswer = useCallback((next: string) => {
    if (stoppedRef.current) return;

    // OpenQuant-style: exact string match advances immediately.
    if (next !== '' && next === questionRef.current.answer) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
      answerRef.current = '';
      setAnswer('');
      const nextQuestion = generateQuestion(modeRef.current);
      questionRef.current = nextQuestion;
      setQuestion(nextQuestion);
      return;
    }

    answerRef.current = next;
    setAnswer(next);
  }, []);

  const appendDigit = useCallback((digit: string) => {
    const current = answerRef.current;
    let next = current;
    if (current === '0') next = digit;
    else if (current === '-0') next = `-${digit}`;
    else if (current.replace('-', '').length >= MAX_ANSWER_LEN) next = current;
    else next = current + digit;
    commitAnswer(next);
  }, [commitAnswer]);

  const toggleMinus = useCallback(() => {
    const current = answerRef.current;
    commitAnswer(current.startsWith('-') ? current.slice(1) : `-${current}`);
  }, [commitAnswer]);

  const backspace = useCallback(() => {
    commitAnswer(answerRef.current.slice(0, -1));
  }, [commitAnswer]);

  function resetDrill() {
    // Restart in place — do not log a score. Replay 3-2-1 before the clock.
    stoppedRef.current = false;
    answerRef.current = '';
    setAnswer('');
    correctCountRef.current = 0;
    setCorrectCount(0);
    const nextQuestion = generateQuestion(modeRef.current);
    questionRef.current = nextQuestion;
    setQuestion(nextQuestion);
    setPhase('countdown');
    setCountdownKey((n) => n + 1);
  }

  function goHome() {
    // Abandon without logging a score (works during countdown too).
    stoppedRef.current = true;
    router.replace('/');
  }

  const isPlaying = phase === 'playing';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.metaRow}>
          <DrillTimer
            totalSeconds={totalSeconds}
            runId={timerRunId}
            active={isPlaying}
            onTimeUp={finishSession}
            isStopped={isStopped}
          />
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

        {phase === 'countdown' ? (
          <StartCountdown key={countdownKey} onComplete={beginPlaying} />
        ) : (
          <>
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
          </>
        )}
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
