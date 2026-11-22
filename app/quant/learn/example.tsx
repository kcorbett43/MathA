import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { colors } from '@/lib/theme';

function paramString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function parseIndex(raw: string | string[] | undefined): number {
  const value = paramString(raw);
  const n = value == null ? NaN : Number(value);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

type Phase = 'attempt' | 'revealed';

export default function QuantLearnExampleScreen() {
  const params = useLocalSearchParams<{ packId?: string; i?: string }>();
  const packId = paramString(params.packId);
  const exampleIndex = parseIndex(params.i);

  const pack = useMemo(() => packById(packId), [packId]);
  const example = pack?.lesson?.examples?.[exampleIndex];
  const exampleCount = pack?.lesson?.examples?.length ?? 0;
  const isLast = exampleIndex >= exampleCount - 1;
  const assetUris = assetUrisForPack(pack);
  const answerType: AnswerType = example?.answerType ?? 'rational';
  const isManual = answerType === 'manual';
  const isChoice = answerType === 'choice' || answerType === 'multiChoice';
  const usesPad = answerType === 'rational' || answerType === 'integer';

  const [answer, setAnswer] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hintVisible, setHintVisible] = useState(false);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('attempt');
  const [manualPhase, setManualPhase] = useState<'prompt' | 'revealed'>('prompt');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [revealedVia, setRevealedVia] = useState<'submit' | 'show' | 'self' | null>(null);

  const answerRef = useRef('');
  const scratchRef = useRef<QuantScratchPadHandle>(null);

  useEffect(() => {
    answerRef.current = '';
    setAnswer('');
    setSelectedIds([]);
    setHintVisible(false);
    setScratchOpen(false);
    setPhase('attempt');
    setManualPhase('prompt');
    setCorrect(null);
    setRevealedVia(null);
  }, [packId, exampleIndex]);

  const commitAnswer = useCallback((next: string) => {
    answerRef.current = next;
    setAnswer(next);
  }, []);

  const reveal = useCallback((via: 'submit' | 'show' | 'self', wasCorrect: boolean | null) => {
    setScratchOpen(false);
    setRevealedVia(via);
    setCorrect(wasCorrect);
    setPhase('revealed');
  }, []);

  const submit = useCallback(() => {
    if (!example || phase !== 'attempt' || isManual) return;

    let user: string | string[] = answerRef.current.trim();
    if (answerType === 'multiChoice') {
      user = selectedIds;
      if (user.length === 0) return;
    } else if (answerType === 'choice') {
      if (!user) return;
    } else if (user === '' || (answerType === 'rational' && user.endsWith('/'))) {
      return;
    }

    const graded = gradeAuthoredAnswer(
      answerType,
      user,
      example.answer,
      example.aliases,
    );
    reveal('submit', graded.kind === 'manual' ? null : graded.correct);
  }, [answerType, example, isManual, phase, reveal, selectedIds]);

  const showSolution = useCallback(() => {
    if (!example || phase !== 'attempt') return;
    if (isManual) {
      setManualPhase('revealed');
      return;
    }
    reveal('show', null);
  }, [example, isManual, phase, reveal]);

  const selfMark = useCallback(
    (wasCorrect: boolean) => {
      if (!isManual || phase !== 'attempt') return;
      reveal('self', wasCorrect);
    },
    [isManual, phase, reveal],
  );

  const goNext = useCallback(() => {
    if (!pack) return;
    if (isLast) {
      router.replace({
        pathname: '/quant/learn/[packId]',
        params: { packId: pack.meta.id },
      });
      return;
    }
    router.replace({
      pathname: '/quant/learn/example',
      params: { packId: pack.meta.id, i: String(exampleIndex + 1) },
    });
  }, [exampleIndex, isLast, pack]);

  if (!pack || !example) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Example not found</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/quant/learn')}
            style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
          >
            <Text style={styles.submitText}>Back to Learn</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit =
    phase === 'attempt' &&
    !isManual &&
    (answerType === 'multiChoice'
      ? selectedIds.length > 0
      : answerType === 'choice'
        ? answer.trim() !== ''
        : answerType === 'text'
          ? answer.trim() !== ''
          : answer.trim() !== '' && !answer.trim().endsWith('/') && !answer.includes('//'));

  const feedbackLabel =
    revealedVia === 'show'
      ? 'Solution'
      : revealedVia === 'self'
        ? correct
          ? 'Marked correct'
          : 'Marked missed'
        : correct
          ? 'Correct'
          : 'Not quite';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Example</Text>
            <Text style={styles.metaValue}>
              {exampleIndex + 1} / {exampleCount}
            </Text>
          </View>
          <View style={[styles.metaBlock, styles.metaGrow]}>
            <Text style={styles.metaLabel}>Unit</Text>
            <Text style={styles.metaMode} numberOfLines={1}>
              {pack.meta.title}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to lesson"
            onPress={() =>
              router.replace({
                pathname: '/quant/learn/[packId]',
                params: { packId: pack.meta.id },
              })
            }
            hitSlop={8}
            style={({ pressed }) => [styles.chipBtn, pressed && styles.chipPressed]}
          >
            <Text style={styles.chipText}>Lesson</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.promptScroll}
          contentContainerStyle={styles.promptBlock}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.exampleTitle}>{example.title}</Text>
          {isManual ? <Text style={styles.manualBadge}>Manual · self-mark</Text> : null}
          <ContentMarkdown text={example.prompt} assetUris={assetUris} style={styles.prompt} />

          {phase === 'attempt' ? (
            <>
              {isManual && manualPhase === 'revealed' ? (
                <View style={styles.revealBlock}>
                  <Text style={styles.stepsLabel}>Solution</Text>
                  {example.steps.map((step, si) => (
                    <Text key={si} style={styles.step}>
                      {si + 1}. {step}
                    </Text>
                  ))}
                </View>
              ) : null}
              {!isManual ? (
                <AnswerInput
                  answerType={answerType}
                  choices={example.choices}
                  value={answer}
                  selectedIds={selectedIds}
                  onChangeText={commitAnswer}
                  onChangeSelectedIds={setSelectedIds}
                  showNumberPad={false}
                />
              ) : null}
              {hintVisible && example.hint ? (
                <Text style={styles.hintText}>{example.hint}</Text>
              ) : null}
            </>
          ) : (
            <View style={styles.revealBlock}>
              <Text
                style={[
                  styles.feedback,
                  revealedVia === 'show'
                    ? styles.feedbackNeutral
                    : correct
                      ? styles.feedbackOk
                      : styles.feedbackBad,
                ]}
              >
                {feedbackLabel}
              </Text>
              {revealedVia === 'submit' && (answer.trim() || selectedIds.length > 0) ? (
                <Text style={styles.yourAnswer}>
                  Your answer:{' '}
                  <Text style={styles.yourAnswerValue}>
                    {isChoice && selectedIds.length
                      ? selectedIds.join(', ')
                      : answer.trim() || selectedIds.join(', ')}
                  </Text>
                </Text>
              ) : null}
              {example.answer != null ? (
                <Text style={styles.canonical}>
                  Answer:{' '}
                  <Text style={styles.canonicalValue}>
                    {Array.isArray(example.answer)
                      ? example.answer.join(', ')
                      : example.answer}
                  </Text>
                </Text>
              ) : null}
              <View style={styles.steps}>
                <Text style={styles.stepsLabel}>Worked steps</Text>
                {example.steps.map((step, si) => (
                  <Text key={si} style={styles.step}>
                    {si + 1}. {step}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {phase === 'attempt' ? (
          <>
            {usesPad && !isManual ? (
              <View
                style={scratchOpen ? styles.scratchHost : styles.scratchHostHidden}
                pointerEvents={scratchOpen ? 'auto' : 'none'}
              >
                <QuantScratchPad ref={scratchRef} resetKey={exampleIndex} />
              </View>
            ) : null}

            {scratchOpen && usesPad ? (
              <View style={styles.toolbar}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => scratchRef.current?.clear()}
                  style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
                >
                  <Text style={styles.toolBtnText}>Clear</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setScratchOpen(false)}
                  style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.submitText}>Done</Text>
                </Pressable>
              </View>
            ) : isManual ? (
              <View style={styles.toolbar}>
                {manualPhase === 'prompt' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={showSolution}
                    style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.submitText}>Show solution</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => selfMark(true)}
                      style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.submitText}>Got it</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => selfMark(false)}
                      style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
                    >
                      <Text style={styles.toolBtnText}>Missed it</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <>
                <View style={styles.toolbar}>
                  {usesPad ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setScratchOpen(true)}
                      style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
                    >
                      <Text style={styles.toolBtnText}>Scratch</Text>
                    </Pressable>
                  ) : null}
                  {example.hint ? (
                    <Pressable
                      accessibilityRole="button"
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
                    onPress={showSolution}
                    style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
                  >
                    <Text style={styles.toolBtnText}>Show solution</Text>
                  </Pressable>
                </View>

                <View style={styles.toolbar}>
                  <Pressable
                    accessibilityRole="button"
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
                    answerType={answerType}
                    value={answer}
                    onChangeText={commitAnswer}
                    showNumberPad
                  />
                ) : null}
              </>
            )}
          </>
        ) : (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={goNext}
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
            >
              <Text style={styles.submitText}>
                {isLast ? 'Back to lesson' : 'Next example'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  missing: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  missingTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaBlock: { gap: 2 },
  metaGrow: { flex: 1 },
  metaLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  metaMode: { fontSize: 15, fontWeight: '600', color: colors.text },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipPressed: { opacity: 0.85 },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  promptScroll: { flexGrow: 1, flexShrink: 1 },
  promptBlock: { gap: 12, paddingBottom: 8 },
  exampleTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  manualBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  prompt: { fontSize: 17, lineHeight: 26, color: colors.subtle, fontWeight: '600' },
  hintText: { fontSize: 15, lineHeight: 22, color: colors.muted },
  revealBlock: { gap: 10 },
  feedback: { fontSize: 18, fontWeight: '700' },
  feedbackOk: { color: '#067647' },
  feedbackBad: { color: '#B42318' },
  feedbackNeutral: { color: colors.primary },
  yourAnswer: { fontSize: 15, color: colors.muted },
  yourAnswerValue: { color: colors.text, fontWeight: '600' },
  canonical: { fontSize: 15, color: colors.muted },
  canonicalValue: { color: colors.text, fontWeight: '700' },
  steps: { gap: 6, marginTop: 4 },
  stepsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  step: { fontSize: 15, lineHeight: 22, color: colors.subtle },
  scratchHost: { flex: 1, minHeight: 160 },
  scratchHostHidden: { height: 0, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toolBtnDisabled: { opacity: 0.45 },
  toolBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  submitBtn: {
    flexGrow: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { paddingTop: 4 },
  pressed: { opacity: 0.85 },
});
