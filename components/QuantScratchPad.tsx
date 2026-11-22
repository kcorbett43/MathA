import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import SignatureCanvas, {
  type SignatureViewRef,
} from 'react-native-signature-canvas';

import { colors } from '@/lib/theme';

export const SCRATCH_PAGE_COUNT = 5;

export type QuantScratchPadHandle = {
  /** Clears the active page only; other pages keep their strokes. */
  clear: () => void;
  /** Wipes all 5 pages and returns to page 1. */
  clearAll: () => void;
};

type Props = {
  /** Remount / wipe all pages when this changes (e.g. question index). */
  resetKey: string | number;
};

type PageSlot = string | null;

const WEB_STYLE = `
  .m-signature-pad {
    box-shadow: none;
    border: none;
    margin: 0;
    width: 100%;
    height: 100%;
  }
  .m-signature-pad--body {
    border: 1px solid #D0D5DB;
    border-radius: 12px;
    background-color: #FFFFFF;
  }
  .m-signature-pad--body canvas {
    border-radius: 12px;
  }
  .m-signature-pad--footer {
    display: none;
    margin: 0;
    height: 0;
  }
  body,html {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: #F7F8FA;
  }
`;

function emptyPages(): PageSlot[] {
  return Array.from({ length: SCRATCH_PAGE_COUNT }, () => null);
}

/**
 * Finger-draw scratch pad for Quant (react-native-signature-canvas + WebView).
 * Up to 5 pages; strokes persist per page until the question resets.
 * Expo Go / native only — web shows a short note.
 */
export const QuantScratchPad = forwardRef<QuantScratchPadHandle, Props>(
  function QuantScratchPad({ resetKey }, ref) {
    const canvasRef = useRef<SignatureViewRef>(null);
    const pagesRef = useRef<PageSlot[]>(emptyPages());
    const activePageRef = useRef(0);
    const [activePage, setActivePage] = useState(0);
    /** Bumps when the visible page's dataURL should remount the canvas. */
    const [canvasEpoch, setCanvasEpoch] = useState(0);
    const [filled, setFilled] = useState<boolean[]>(() =>
      Array.from({ length: SCRATCH_PAGE_COUNT }, () => false),
    );

    // Pending capture: after readSignature, apply this page switch (or null = save only).
    const pendingSwitchRef = useRef<number | null>(null);
    const captureGenRef = useRef(0);

    useEffect(() => {
      pagesRef.current = emptyPages();
      activePageRef.current = 0;
      setActivePage(0);
      setFilled(Array.from({ length: SCRATCH_PAGE_COUNT }, () => false));
      pendingSwitchRef.current = null;
      captureGenRef.current += 1;
      setCanvasEpoch((n) => n + 1);
    }, [resetKey]);

    const markFilled = useCallback((page: number, hasInk: boolean) => {
      setFilled((prev) => {
        if (prev[page] === hasInk) return prev;
        const next = [...prev];
        next[page] = hasInk;
        return next;
      });
    }, []);

    const applyCaptured = useCallback(
      (signature: string | null) => {
        const page = activePageRef.current;
        pagesRef.current[page] = signature;
        markFilled(page, Boolean(signature));

        const target = pendingSwitchRef.current;
        pendingSwitchRef.current = null;
        if (target === null || target === page) return;

        activePageRef.current = target;
        setActivePage(target);
        setCanvasEpoch((n) => n + 1);
      },
      [markFilled],
    );

    const flushActive = useCallback(
      (thenSwitchTo: number | null) => {
        pendingSwitchRef.current = thenSwitchTo;
        captureGenRef.current += 1;
        const gen = captureGenRef.current;
        // If WebView never responds, still switch after a short timeout.
        setTimeout(() => {
          if (captureGenRef.current !== gen) return;
          applyCaptured(pagesRef.current[activePageRef.current]);
        }, 400);
        canvasRef.current?.readSignature();
      },
      [applyCaptured],
    );

    useImperativeHandle(ref, () => ({
      clear() {
        const page = activePageRef.current;
        pagesRef.current[page] = null;
        markFilled(page, false);
        canvasRef.current?.clearSignature();
      },
      clearAll() {
        pagesRef.current = emptyPages();
        activePageRef.current = 0;
        setActivePage(0);
        setFilled(Array.from({ length: SCRATCH_PAGE_COUNT }, () => false));
        pendingSwitchRef.current = null;
        captureGenRef.current += 1;
        setCanvasEpoch((n) => n + 1);
      },
    }));

    const onOK = useCallback(
      (signature: string) => {
        applyCaptured(signature || null);
      },
      [applyCaptured],
    );

    const onEmpty = useCallback(() => {
      applyCaptured(null);
    }, [applyCaptured]);

    // Autosave strokes when a stroke ends (keeps page data fresh if user Done's without switching).
    const onEnd = useCallback(() => {
      pendingSwitchRef.current = null;
      canvasRef.current?.readSignature();
    }, []);

    const selectPage = useCallback(
      (page: number) => {
        if (page === activePageRef.current) return;
        flushActive(page);
      },
      [flushActive],
    );

    if (Platform.OS === 'web') {
      return (
        <View style={styles.column}>
          <PageTabs activePage={0} filled={filled} onSelect={() => {}} disabled />
          <View style={styles.webFallback}>
            <Text style={styles.webFallbackText}>
              Scratch pad works in Expo Go on a phone (finger draw). Open this
              session there to sketch across up to 5 pages.
            </Text>
          </View>
        </View>
      );
    }

    const dataURL = pagesRef.current[activePage] ?? undefined;

    return (
      <View style={styles.column}>
        <PageTabs activePage={activePage} filled={filled} onSelect={selectPage} />
        <View style={styles.wrap}>
          <SignatureCanvas
            key={`${resetKey}-${activePage}-${canvasEpoch}`}
            ref={canvasRef}
            dataURL={dataURL}
            descriptionText=""
            clearText=""
            confirmText=""
            penColor={colors.text}
            backgroundColor={colors.surface}
            minWidth={1.5}
            maxWidth={3}
            webStyle={WEB_STYLE}
            style={styles.canvas}
            webviewContainerStyle={styles.webviewContainer}
            androidLayerType="hardware"
            onOK={onOK}
            onEmpty={onEmpty}
            onEnd={onEnd}
            webviewProps={{
              scrollEnabled: false,
              bounces: false,
              showsHorizontalScrollIndicator: false,
              showsVerticalScrollIndicator: false,
            }}
          />
        </View>
      </View>
    );
  },
);

function PageTabs({
  activePage,
  filled,
  onSelect,
  disabled = false,
}: {
  activePage: number;
  filled: boolean[];
  onSelect: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {Array.from({ length: SCRATCH_PAGE_COUNT }, (_, i) => {
        const selected = i === activePage;
        return (
          <Pressable
            key={i}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Scratch page ${i + 1}${filled[i] ? ', has drawing' : ''}`}
            disabled={disabled}
            onPress={() => onSelect(i)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && !disabled && styles.tabPressed,
            ]}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
              {i + 1}
            </Text>
            {filled[i] ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    minHeight: 200,
    gap: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  tab: {
    minWidth: 40,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 3,
  },
  tabSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.chip,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextSelected: {
    color: colors.primary,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  dotSpacer: {
    width: 5,
    height: 5,
  },
  wrap: {
    flex: 1,
    minHeight: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webviewContainer: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    minHeight: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webFallbackText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
});
