import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NumberPad } from '@/components/NumberPad';
import {
  QuantScratchPad,
  type QuantScratchPadHandle,
} from '@/components/QuantScratchPad';
import { packById } from '@/content/packs';
import { answersMatch } from '@/lib/fraction';
import { colors } from '@/lib/theme';

const MAX_ANSWER_LEN = 12;

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
  const example = pack?.lesson.examples[exampleIndex];
  const exampleCount = pack?.lesson.examples.length ?? 0;
  const isLast = exampleIndex >= exampleCount - 1;

  const [answer, setAnswer] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('attempt');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [revealedVia, setRevealedVia] = useState<'submit' | 'show' | null>(null);

  const answerRef = useRef('');
  const scratchRef = useRef<QuantScratchPadHandle>(null);

  // Same route + new `i` keeps the screen mounted — reset attempt state.
  useEffect(() => {
    answerRef.current = '';
    setAnswer('');
    setHintVisible(false);
    setScratchOpen(false);
    setPhase('attempt');
    setCorrect(null);
    setRevealedVia(null);
  }, [packId, exampleIndex]);

  const commitAnswer = useCallback((next: string) => {
    answerRef.current = next;
    setAnswer(next);
  }, []);

  const appendDigit = useCallback(
    (digit: string) => {
      if (phase !== 'attempt') return;
      const current = answerRef.current;
      let next = current;
      const body = current.replace('-', '');
      const digitCount = body.replace('/', '').length;
      if (digitCount >= MAX_ANSWER_LEN) next = current;
      else if (current === '0') next = digit;
      else next = current + digit;
      commitAnswer(next);
    },
    [commitAnswer, phase],
  );

  const insertSlash = useCallback(() => {
    if (phase !== 'attempt') return;
    const current = answerRef.current;
    if (current.includes('/')) return;
    if (current === '' || current === '-') return;
    commitAnswer(`${current}/`);
  }, [commitAnswer, phase]);

  const backspace = useCallback(() => {
    if (phase !== 'attempt') return;
    commitAnswer(answerRef.current.slice(0, -1));
  }, [commitAnswer, phase]);

  const reveal = useCallback((via: 'submit' | 'show', wasCorrect: boolean | null) => {
    setScratchOpen(false);
    setRevealedVia(via);
    setCorrect(wasCorrect);
    setPhase('revealed');
  }, []);

  const submit = useCallback(() => {
    if (!example || phase !== 'attempt') return;
    const user = answerRef.current.trim();
    if (user === '' || user.endsWith('/')) return;
    reveal('submit', answersMatch(user, example.answer));
  }, [example, phase, reveal]);

  const showSolution = useCallback(() => {
    if (!example || phase !== 'attempt') return;
    reveal('show', null);
  }, [example, phase, reveal]);

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
    answer.trim() !== '' &&
    !answer.trim().endsWith('/') &&
    !answer.includes('//');

  const feedbackLabel =
    revealedVia === 'show'
      ? 'Solution'
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

        {scratchOpen && phase === 'attempt' ? (
          <ScrollView
            style={styles.scratchPromptScroll}
            contentContainerStyle={styles.scratchPromptBlock}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.exampleTitle}>{example.title}</Text>
            <Text style={styles.prompt}>{example.prompt}</Text>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.promptScroll}
            contentContainerStyle={styles.promptBlock}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.exampleTitle}>{example.title}</Text>
            <Text style={styles.prompt}>{example.prompt}</Text>

            {phase === 'attempt' ? (
              <>
                <View style={styles.answerBox}>
                  <Text style={styles.answerText}>{answer || ' '}</Text>
                </View>
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
                {revealedVia === 'submit' && answer.trim() ? (
                  <Text style={styles.yourAnswer}>
                    Your answer:{' '}
                    <Text style={styles.yourAnswerValue}>{answer.trim()}</Text>
                  </Text>
                ) : null}
                <Text style={styles.canonical}>
                  Answer: <Text style={styles.canonicalValue}>{example.answer}</Text>
                </Text>
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
        )}

        {phase === 'attempt' ? (
          <>
            <View
              style={scratchOpen ? styles.scratchHost : styles.scratchHostHidden}
              pointerEvents={scratchOpen ? 'auto' : 'none'}
            >
              <QuantScratchPad ref={scratchRef} resetKey={exampleIndex} />
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
                  {example.hint ? (
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
                    accessibilityLabel="Show solution without answering"
                    onPress={showSolution}
                    style={({ pressed }) => [styles.toolBtn, pressed && styles.chipPressed]}
                  >
                    <Text style={styles.toolBtnText}>Show solution</Text>
                  </Pressable>
                </View>

                <View style={styles.toolbar}>
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
          </>
        ) : (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Back to lesson' : 'Next example'}
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
  missing: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
  },
  missingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
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
    gap: 14,
    paddingVertical: 8,
    paddingBottom: 12,
  },
  scratchPromptBlock: {
    paddingVertical: 4,
    paddingBottom: 8,
    gap: 8,
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
  exampleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
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
  revealBlock: {
    width: '100%',
    gap: 10,
    alignItems: 'stretch',
    paddingHorizontal: 4,
  },
  feedback: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackOk: {
    color: colors.success,
  },
  feedbackBad: {
    color: colors.danger,
  },
  feedbackNeutral: {
    color: colors.subtle,
  },
  yourAnswer: {
    fontSize: 15,
    color: colors.subtle,
    textAlign: 'center',
  },
  yourAnswerValue: {
    fontWeight: '700',
    color: colors.text,
  },
  canonical: {
    fontSize: 16,
    color: colors.subtle,
    textAlign: 'center',
  },
  canonicalValue: {
    fontWeight: '700',
    color: colors.success,
  },
  steps: {
    gap: 6,
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  step: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.subtle,
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
  footer: {
    gap: 10,
  },
  pressed: {
    opacity: 0.85,
  },
});
