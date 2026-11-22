import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NumberPad } from '@/components/NumberPad';
import {
  QuantScratchPad,
  type QuantScratchPadHandle,
} from '@/components/QuantScratchPad';
import { packById, type GeneratorId } from '@/content/packs';
import { answersMatch } from '@/lib/fraction';
import { generateQuantQuestion } from '@/lib/generators/quant';
import { buildLearnDrillSequence } from '@/lib/learnDrill';
import { setQuantReview } from '@/lib/quantSessionStore';
import {
  quantSkillById,
  type QuantQuestion,
  type QuantReviewItem,
  type QuantSkillId,
} from '@/lib/quantTypes';
import { colors } from '@/lib/theme';

const MAX_ANSWER_LEN = 12;

function parseSkill(raw: string | string[] | undefined): QuantSkillId | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'dice' || value === 'urns' || value === 'ev') return value;
  return undefined;
}

function paramString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

type SessionMode =
  | { kind: 'practice'; skillId: QuantSkillId; total: number; label: string }
  | {
      kind: 'learn';
      packId: string;
      skillId: QuantSkillId;
      total: number;
      label: string;
      sequence: GeneratorId[];
    };

export default function QuantSessionScreen() {
  const params = useLocalSearchParams<{ skill?: string; pack?: string }>();

  const mode: SessionMode = useMemo(() => {
    const packId = paramString(params.pack);
    const pack = packById(packId);
    if (pack) {
      const sequence = buildLearnDrillSequence(pack);
      const primary = (pack.drill.newTopicTags[0] ?? 'dice') as QuantSkillId;
      return {
        kind: 'learn' as const,
        packId: pack.meta.id,
        skillId: primary,
        total: sequence.length,
        label: pack.meta.title,
        sequence,
      };
    }
    const skillId = parseSkill(params.skill) ?? 'dice';
    const skill = quantSkillById(skillId)!;
    return {
      kind: 'practice' as const,
      skillId,
      total: skill.questionCount,
      label: skill.label,
    };
  }, [params.pack, params.skill]);

  const sequenceRef = useRef<GeneratorId[] | null>(
    mode.kind === 'learn' ? mode.sequence : null,
  );
  // Keep sequence stable for this mount (Learn regenerates on remount / replay).
  if (mode.kind === 'learn' && sequenceRef.current === null) {
    sequenceRef.current = mode.sequence;
  }

  const total = mode.total;
  const sessionLabel = mode.label;

  const skillAt = useCallback(
    (i: number): QuantSkillId => {
      if (mode.kind === 'learn') {
        const seq = sequenceRef.current ?? mode.sequence;
        return (seq[i] ?? mode.skillId) as QuantSkillId;
      }
      return mode.skillId;
    },
    [mode],
  );

  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<QuantQuestion>(() =>
    generateQuantQuestion(skillAt(0)),
  );
  const [answer, setAnswer] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [scratchOpen, setScratchOpen] = useState(false);

  const answerRef = useRef('');
  const questionRef = useRef(question);
  const indexRef = useRef(0);
  const reviewRef = useRef<QuantReviewItem[]>([]);
  const stoppedRef = useRef(false);
  const scratchRef = useRef<QuantScratchPadHandle>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  questionRef.current = question;

  const commitAnswer = useCallback((next: string) => {
    answerRef.current = next;
    setAnswer(next);
  }, []);

  const appendDigit = useCallback(
    (digit: string) => {
      const current = answerRef.current;
      let next = current;
      const body = current.replace('-', '');
      const digitCount = body.replace('/', '').length;
      if (digitCount >= MAX_ANSWER_LEN) next = current;
      else if (current === '0') next = digit;
      else next = current + digit;
      commitAnswer(next);
    },
    [commitAnswer],
  );

  const insertSlash = useCallback(() => {
    const current = answerRef.current;
    if (current.includes('/')) return;
    if (current === '' || current === '-') return;
    commitAnswer(`${current}/`);
  }, [commitAnswer]);

  const backspace = useCallback(() => {
    commitAnswer(answerRef.current.slice(0, -1));
  }, [commitAnswer]);

  const finishToReview = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    const m = modeRef.current;
    setQuantReview({
      skillId: m.skillId,
      packId: m.kind === 'learn' ? m.packId : undefined,
      items: reviewRef.current,
    });
    router.replace({
      pathname: '/quant/review',
      params:
        m.kind === 'learn'
          ? { pack: m.packId }
          : { skill: m.skillId },
    });
  }, []);

  const submit = useCallback(() => {
    if (stoppedRef.current) return;
    const user = answerRef.current.trim();
    if (user === '' || user.endsWith('/')) return;

    const q = questionRef.current;
    const correct = answersMatch(user, q.answer);
    reviewRef.current.push({
      prompt: q.prompt,
      userAnswer: user,
      correctAnswer: q.answer,
      correct,
    });

    const nextIndex = indexRef.current + 1;
    if (nextIndex >= total) {
      finishToReview();
      return;
    }

    indexRef.current = nextIndex;
    setIndex(nextIndex);
    answerRef.current = '';
    setAnswer('');
    setHintVisible(false);
    setScratchOpen(false);
    // resetKey (question index) wipes all scratch pages for the next item
    const nextQ = generateQuantQuestion(skillAt(nextIndex));
    questionRef.current = nextQ;
    setQuestion(nextQ);
  }, [finishToReview, skillAt, total]);

  function goHome() {
    stoppedRef.current = true;
    router.replace('/');
  }

  const canSubmit =
    answer.trim() !== '' && !answer.trim().endsWith('/') && !answer.includes('//');

  const metaKindLabel = mode.kind === 'learn' ? 'Unit' : 'Skill';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Progress</Text>
            <Text style={styles.metaValue}>
              {index + 1} / {total}
            </Text>
          </View>
          <View style={[styles.metaBlock, styles.metaGrow]}>
            <Text style={styles.metaLabel}>{metaKindLabel}</Text>
            <Text style={styles.metaMode} numberOfLines={1}>
              {sessionLabel}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go home"
            onPress={goHome}
            hitSlop={8}
            style={({ pressed }) => [styles.chipBtn, pressed && styles.chipPressed]}
          >
            <Text style={styles.chipText}>Home</Text>
          </Pressable>
        </View>

        {scratchOpen ? (
          <ScrollView
            style={styles.scratchPromptScroll}
            contentContainerStyle={styles.scratchPromptBlock}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.prompt}>{question.prompt}</Text>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.promptScroll}
            contentContainerStyle={styles.promptBlock}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.prompt}>{question.prompt}</Text>
            <View style={styles.answerBox}>
              <Text style={styles.answerText}>{answer || ' '}</Text>
            </View>
            {hintVisible && question.hint ? (
              <Text style={styles.hintText}>{question.hint}</Text>
            ) : null}
          </ScrollView>
        )}

        {/* Keep mounted while collapsed so page strokes survive reopen on this question. */}
        <View
          style={scratchOpen ? styles.scratchHost : styles.scratchHostHidden}
          pointerEvents={scratchOpen ? 'auto' : 'none'}
        >
          <QuantScratchPad ref={scratchRef} resetKey={index} />
        </View>

        {scratchOpen ? (
          <View style={styles.toolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear current scratch page"
              onPress={() => scratchRef.current?.clear()}
              style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
            >
              <Text style={styles.toolBtnText}>Clear</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all scratch pages"
              onPress={() => scratchRef.current?.clearAll()}
              style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
            >
              <Text style={styles.toolBtnText}>Clear all</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close scratch pad"
              onPress={() => setScratchOpen(false)}
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
            >
              <Text style={styles.submitText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.toolbar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open scratch pad"
                onPress={() => setScratchOpen(true)}
                style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
              >
                <Text style={styles.toolBtnText}>Scratch</Text>
              </Pressable>
              {question.hint ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Show hint"
                  disabled={hintVisible}
                  onPress={() => setHintVisible(true)}
                  style={({ pressed }) => [
                    styles.toolBtn,
                    hintVisible && styles.toolBtnDisabled,
                    pressed && !hintVisible && styles.chipPressed,
                  ]}
                >
                  <Text style={styles.toolBtnText}>
                    {hintVisible ? 'Hint shown' : 'Hint'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Submit answer"
                disabled={!canSubmit}
                onPress={submit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  !canSubmit && styles.submitDisabled,
                  pressed && canSubmit && styles.pressed,
                ]}
              >
                <Text style={styles.submitText}>Submit</Text>
              </Pressable>
            </View>

            <NumberPad
              allowNegative={false}
              allowFraction
              onDigit={appendDigit}
              onSlash={insertSlash}
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
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metaBlock: {
    gap: 2,
  },
  metaGrow: {
    flex: 1,
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
  promptScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scratchPromptScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 140,
  },
  promptBlock: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    paddingBottom: 12,
  },
  scratchPromptBlock: {
    paddingVertical: 4,
    paddingBottom: 8,
  },
  scratchHost: {
    flex: 1,
    minHeight: 200,
  },
  scratchHostHidden: {
    height: 0,
    minHeight: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  prompt: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  answerBox: {
    minWidth: 160,
    minHeight: 52,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  answerText: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
  },
  hintText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  toolBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toolBtnDisabled: {
    opacity: 0.55,
  },
  toolBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
