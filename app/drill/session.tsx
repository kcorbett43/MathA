import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DrillTimer } from '@/components/DrillTimer';
import { NumberPad } from '@/components/NumberPad';
import { StartCountdown } from '@/components/StartCountdown';
import { competitionAnswerMatches } from '@/lib/generators/competition';
import { generateQuestion } from '@/lib/generators';
import { colors } from '@/lib/theme';
import {
  modeLabel,
  parseGameMode,
  isCompetitionMode,
  pointsPerCorrect,
  parseDurationMinutes,
  type Question,
} from '@/lib/types';

const MAX_ANSWER_LEN = 10;

type Phase = 'countdown' | 'playing';

export default function DrillScreen() {
  const params = useLocalSearchParams<{ mode?: string; duration?: string }>();
  const mode = useMemo(() => parseGameMode(params.mode), [params.mode]);
  const durationMinutes = useMemo(
    () => parseDurationMinutes(params.duration),
    [params.duration],
  );
  const competition = isCompetitionMode(mode);
  const totalSeconds = durationMinutes * 60;

  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdownKey, setCountdownKey] = useState(0);
  const [timerRunId, setTimerRunId] = useState(0);
  const [question, setQuestion] = useState<Question>(() => generateQuestion(mode));
  const [answer, setAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);

  const deadlineRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);
  const answerRef = useRef('');
  const questionRef = useRef(question);
  const correctCountRef = useRef(0);
  const modeRef = useRef(mode);
  const answerFlushRafRef = useRef<number | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  useEffect(() => () => {
    if (answerFlushRafRef.current != null) cancelAnimationFrame(answerFlushRafRef.current);
  }, []);

  const isStopped = useCallback(() => stoppedRef.current, []);

  const cancelAnswerFlush = useCallback(() => {
    if (answerFlushRafRef.current != null) {
      cancelAnimationFrame(answerFlushRafRef.current);
      answerFlushRafRef.current = null;
    }
  }, []);

  /** Coalesce digit paints to one React state write per frame; keep answerRef authoritative. */
  const scheduleAnswerFlush = useCallback(() => {
    if (answerFlushRafRef.current != null) return;
    answerFlushRafRef.current = requestAnimationFrame(() => {
      answerFlushRafRef.current = null;
      setAnswer(answerRef.current);
    });
  }, []);

  const finishSession = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    cancelAnswerFlush();
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
  }, [cancelAnswerFlush, durationMinutes]);

  const beginPlaying = useCallback(() => {
    if (stoppedRef.current) return;
    deadlineRef.current = Date.now() + totalSeconds * 1000;
    setPhase('playing');
    setTimerRunId((n) => n + 1);
  }, [totalSeconds]);

  const commitAnswer = useCallback(
    (next: string) => {
      if (stoppedRef.current) return;

      if (deadlineRef.current == null) return;
      if (Date.now() >= deadlineRef.current) {
        finishSession();
        return;
      }

      // Always buffer in the ref first so rapid onPressIn digits never race React state.
      answerRef.current = next;

      // OpenQuant-style: exact string match advances immediately.
      if (next !== '' && (isCompetitionMode(modeRef.current)
        ? competitionAnswerMatches(next, questionRef.current.answer)
        : next === questionRef.current.answer)) {
        cancelAnswerFlush();
        correctCountRef.current += 1;
        answerRef.current = '';
        const nextQuestion = generateQuestion(modeRef.current, correctCountRef.current);
        questionRef.current = nextQuestion;
        // Flush score + cleared answer + next prompt together (auto-advance UX).
        setCorrectCount(correctCountRef.current);
        setAnswer('');
        setQuestion(nextQuestion);
        return;
      }

      scheduleAnswerFlush();
    },
    [cancelAnswerFlush, scheduleAnswerFlush, finishSession],
  );

  const appendDigit = useCallback(
    (digit: string) => {
      const current = answerRef.current;
      let next = current;
      if (current === '0') next = digit;
      else if (current === '-0') next = `-${digit}`;
      else if (current.replace('-', '').length >= MAX_ANSWER_LEN) next = current;
      else next = current + digit;
      commitAnswer(next);
    },
    [commitAnswer],
  );

  const appendDecimal = useCallback(() => {
    const current = answerRef.current;
    if (!current.includes('.')) {
      commitAnswer(current === '' ? '0.' : current === '-' ? '-0.' : `${current}.`);
    }
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
    deadlineRef.current = null;
    stoppedRef.current = false;
    cancelAnswerFlush();
    answerRef.current = '';
    setAnswer('');
    correctCountRef.current = 0;
    setCorrectCount(0);
    const nextQuestion = generateQuestion(modeRef.current, correctCountRef.current);
    questionRef.current = nextQuestion;
    setQuestion(nextQuestion);
    setPhase('countdown');
    setCountdownKey((n) => n + 1);
  }

  function goHome() {
    // Abandon without logging a score (works during countdown too).
    stoppedRef.current = true;
    cancelAnswerFlush();
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
            <Text style={styles.metaLabel}>{competition ? 'Points' : 'Score'}</Text>
            <Text style={styles.metaValue}>{correctCount * pointsPerCorrect(mode)}</Text>
            {competition && <Text style={styles.metaLabel}>{correctCount} correct</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Mode</Text>
            <Text style={styles.metaMode} numberOfLines={2}>
              {modeLabel(mode).replace('Competition ', '')}
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
              accessibilityLabel={competition ? "Reset competition" : "Reset drill"}
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
            <ScrollView style={styles.promptScroll} contentContainerStyle={styles.promptBlock}>
              {question.terms ? (
                <View accessibilityLabel="Vertical sum" style={styles.stack}>
                  {question.terms.map((term, index) => (
                    <Text key={index} style={styles.stackTerm}>{term}</Text>
                  ))}
                </View>
              ) : <Text
                style={[
                  styles.prompt,
                  mode === 'arithmeticPro' && styles.promptPro,
                  mode === 'sequence' && styles.promptSequence,
                ]}
              >
                {question.prompt}
              </Text>}
              <View style={styles.answerBox}>
                <Text style={styles.answerText}>{answer || ' '}</Text>
              </View>
            </ScrollView>

            <NumberPad
              allowNegative
              allowDecimal={mode === 'competitionAddition'}
              onDecimal={appendDecimal}
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
  promptScroll: { flex: 1 },
  stack: { alignItems: 'stretch', minWidth: 140 },
  stackTerm: { fontSize: 20, lineHeight: 23, fontVariant: ['tabular-nums'], textAlign: 'right', color: colors.text },
  promptBlock: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
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
