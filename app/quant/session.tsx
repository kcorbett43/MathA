import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnswerInput } from '@/components/AnswerInput';
import { ContentMarkdown } from '@/components/ContentMarkdown';
import {
  QuantScratchPad,
  type QuantScratchPadHandle,
} from '@/components/QuantScratchPad';
import { gradeAuthoredAnswer } from '@/content/matha';
import { packById, type AnswerType } from '@/content/packs';
import { assetUrisForPack } from '@/lib/content/assetUris';
import { answersMatch } from '@/lib/fraction';
import { generateQuantQuestion } from '@/lib/generators/quant';
import { buildPracticeSequence, type PracticeSlot } from '@/lib/learnDrill';
import { setQuantReview } from '@/lib/quantSessionStore';
import {
  quantSkillById,
  type QuantQuestion,
  type QuantReviewItem,
  type QuantSkillId,
} from '@/lib/quantTypes';
import { colors } from '@/lib/theme';

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
      sequence: PracticeSlot[];
    };

function questionFromSlot(slot: PracticeSlot | undefined, fallback: QuantSkillId): QuantQuestion {
  if (!slot || slot.kind === 'generated') {
    return generateQuantQuestion(slot?.generatorId ?? fallback);
  }
  const q = slot.question;
  const canonical =
    q.answerType === 'multiChoice'
      ? (Array.isArray(q.answer) ? q.answer.join(',') : String(q.answer ?? ''))
      : String(Array.isArray(q.answer) ? q.answer[0] ?? '' : q.answer ?? '');
  return {
    prompt: q.prompt,
    answer: canonical,
    hint: q.hint,
    skillId: fallback,
  };
}

export default function QuantSessionScreen() {
  const params = useLocalSearchParams<{ skill?: string; pack?: string }>();

  const mode: SessionMode = useMemo(() => {
    const packId = paramString(params.pack);
    const pack = packById(packId);
    if (pack) {
      const sequence = buildPracticeSequence(pack);
      const primary = (pack.practice?.generators?.[0] ??
        pack.drill?.newTopicTags?.[0] ??
        'dice') as QuantSkillId;
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

  const sequenceRef = useRef<PracticeSlot[] | null>(
    mode.kind === 'learn' ? mode.sequence : null,
  );
  // Keep sequence stable for this mount (Learn regenerates on remount / replay).
  if (mode.kind === 'learn' && sequenceRef.current === null) {
    sequenceRef.current = mode.sequence;
  }

  const total = mode.total;
  const sessionLabel = mode.label;

  const slotAt = useCallback(
    (i: number): PracticeSlot | undefined => {
      if (mode.kind !== 'learn') return undefined;
      const seq = sequenceRef.current ?? mode.sequence;
      return seq[i];
    },
    [mode],
  );

  const skillAt = useCallback(
    (i: number): QuantSkillId => {
      const slot = slotAt(i);
      if (slot?.kind === 'generated') return slot.generatorId;
      if (mode.kind === 'learn') return mode.skillId;
      return mode.skillId;
    },
    [mode, slotAt],
  );

  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<QuantQuestion>(() =>
    mode.kind === 'learn'
      ? questionFromSlot(slotAt(0), mode.skillId)
      : generateQuantQuestion(skillAt(0)),
  );
  const [answer, setAnswer] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hintVisible, setHintVisible] = useState(false);
  const [scratchOpen, setScratchOpen] = useState(false);
  /** Manual authored: attempt → reveal solution → self-mark. */
  const [manualPhase, setManualPhase] = useState<'prompt' | 'revealed'>('prompt');
  const learnPack = mode.kind === 'learn' ? packById(mode.packId) : undefined;
  const assetUris = assetUrisForPack(learnPack);

  const answerRef = useRef('');
  const questionRef = useRef(question);
  const indexRef = useRef(0);
  const reviewRef = useRef<QuantReviewItem[]>([]);
  const stoppedRef = useRef(false);
  const scratchRef = useRef<QuantScratchPadHandle>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  questionRef.current = question;

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

  const currentSlot = slotAt(index);
  const authoredType: AnswerType | undefined =
    currentSlot?.kind === 'authored' ? currentSlot.question.answerType : undefined;
  const isManual = authoredType === 'manual';
  const usesPad =
    !authoredType || authoredType === 'rational' || authoredType === 'integer';
  const manualSteps =
    currentSlot?.kind === 'authored' ? currentSlot.question.steps ?? [] : [];
  const authoredChoices =
    currentSlot?.kind === 'authored' ? currentSlot.question.choices : undefined;

  const advanceAfterGrade = useCallback(
    (correct: boolean, userAnswer: string, correctAnswer: string) => {
      const q = questionRef.current;
      reviewRef.current.push({
        prompt: q.prompt,
        userAnswer,
        correctAnswer,
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
      setSelectedIds([]);
      setHintVisible(false);
      setScratchOpen(false);
      setManualPhase('prompt');
      const nextQ =
        modeRef.current.kind === 'learn'
          ? questionFromSlot(slotAt(nextIndex), modeRef.current.skillId)
          : generateQuantQuestion(skillAt(nextIndex));
      questionRef.current = nextQ;
      setQuestion(nextQ);
    },
    [finishToReview, skillAt, slotAt, total],
  );

  const submit = useCallback(() => {
    if (stoppedRef.current) return;
    const slot = slotAt(indexRef.current);
    if (slot?.kind === 'authored' && slot.question.answerType === 'manual') return;

    const q = questionRef.current;
    let user: string | string[] = answerRef.current.trim();
    if (slot?.kind === 'authored' && slot.question.answerType === 'multiChoice') {
      user = selectedIds;
      if (user.length === 0) return;
    } else if (slot?.kind === 'authored' && slot.question.answerType === 'choice') {
      if (!user) return;
    } else if (user === '' || user.endsWith('/')) {
      return;
    }

    let correct: boolean;
    if (slot?.kind === 'authored') {
      const graded = gradeAuthoredAnswer(
        slot.question.answerType,
        user,
        slot.question.answer,
        slot.question.aliases,
      );
      correct = graded.kind === 'manual' ? true : graded.correct;
    } else {
      correct = answersMatch(String(user), q.answer);
    }
    const userStr = Array.isArray(user) ? user.join(',') : user;
    advanceAfterGrade(correct, userStr, q.answer);
  }, [advanceAfterGrade, selectedIds, slotAt]);

  const selfMark = useCallback(
    (correct: boolean) => {
      if (stoppedRef.current || !isManual) return;
      const slot = slotAt(indexRef.current);
      const steps =
        slot?.kind === 'authored' ? (slot.question.steps ?? []).join(' ') : '';
      advanceAfterGrade(correct, correct ? 'self:correct' : 'self:missed', steps || '(manual)');
    },
    [advanceAfterGrade, isManual, slotAt],
  );

  function goHome() {
    stoppedRef.current = true;
    router.replace('/');
  }

  const canSubmit =
    !isManual &&
    (authoredType === 'multiChoice'
      ? selectedIds.length > 0
      : authoredType === 'choice' || authoredType === 'text'
        ? answer.trim() !== ''
        : answer.trim() !== '' && !answer.trim().endsWith('/') && !answer.includes('//'));

  const metaKindLabel = mode.kind === 'learn' ? 'Unit' : 'Skill';
  const commitAnswer = useCallback((next: string) => {
    answerRef.current = next;
    setAnswer(next);
  }, []);

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

        {isManual ? (
          <ScrollView
            style={styles.promptScroll}
            contentContainerStyle={styles.promptBlock}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.manualBadge}>Manual · self-mark</Text>
            <ContentMarkdown text={question.prompt} assetUris={assetUris} style={styles.prompt} />
            {manualPhase === 'revealed' ? (
              <View style={styles.manualReveal}>
                <Text style={styles.sectionLabel}>Solution</Text>
                {manualSteps.length > 0 ? (
                  manualSteps.map((step, i) => (
                    <Text key={i} style={styles.hintText}>
                      {step}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.hintText}>
                    Review your answer, then mark whether you got it.
                  </Text>
                )}
              </View>
            ) : null}
          </ScrollView>
        ) : scratchOpen && usesPad ? (
          <ScrollView
            style={styles.scratchPromptScroll}
            contentContainerStyle={styles.scratchPromptBlock}
            keyboardShouldPersistTaps="handled"
          >
            <ContentMarkdown text={question.prompt} assetUris={assetUris} style={styles.prompt} />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.promptScroll}
            contentContainerStyle={styles.promptBlock}
            keyboardShouldPersistTaps="handled"
          >
            <ContentMarkdown text={question.prompt} assetUris={assetUris} style={styles.prompt} />
            {authoredType && !usesPad ? (
              <AnswerInput
                answerType={authoredType}
                choices={authoredChoices}
                value={answer}
                selectedIds={selectedIds}
                onChangeText={commitAnswer}
                onChangeSelectedIds={setSelectedIds}
                showNumberPad={false}
              />
            ) : null}
            {hintVisible && question.hint ? (
              <Text style={styles.hintText}>{question.hint}</Text>
            ) : null}
          </ScrollView>
        )}

        {usesPad && !isManual ? (
          <View
            style={scratchOpen ? styles.scratchHost : styles.scratchHostHidden}
            pointerEvents={scratchOpen ? 'auto' : 'none'}
          >
            <QuantScratchPad ref={scratchRef} resetKey={index} />
          </View>
        ) : null}

        {isManual ? (
          <View style={styles.toolbar}>
            {manualPhase === 'prompt' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show solution"
                onPress={() => setManualPhase('revealed')}
                style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
              >
                <Text style={styles.submitText}>Show solution</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark correct"
                  onPress={() => selfMark(true)}
                  style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.submitText}>Got it</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark incorrect"
                  onPress={() => selfMark(false)}
                  style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
                >
                  <Text style={styles.toolBtnText}>Missed it</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : scratchOpen && usesPad ? (
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
              {usesPad ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open scratch pad"
                  onPress={() => setScratchOpen(true)}
                  style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
                >
                  <Text style={styles.toolBtnText}>Scratch</Text>
                </Pressable>
              ) : null}
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

            {usesPad ? (
              <AnswerInput
                answerType={authoredType ?? 'rational'}
                value={answer}
                onChangeText={commitAnswer}
                showNumberPad
              />
            ) : null}
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
  manualBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  manualReveal: {
    gap: 6,
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
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
