import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import SignatureCanvas, {
  type SignatureViewRef,
} from 'react-native-signature-canvas';

import { colors } from '@/lib/theme';

export type QuantScratchPadHandle = {
  clear: () => void;
};

type Props = {
  /** Remount when this changes (e.g. question index) to wipe strokes. */
  resetKey: string | number;
};

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

/**
 * Finger-draw scratch pad for Quant (react-native-signature-canvas + WebView).
 * Expo Go / native only — web shows a short note.
 */
export const QuantScratchPad = forwardRef<QuantScratchPadHandle, Props>(
  function QuantScratchPad({ resetKey }, ref) {
    const canvasRef = useRef<SignatureViewRef>(null);

    useImperativeHandle(ref, () => ({
      clear() {
        canvasRef.current?.clearSignature();
      },
    }));

    if (Platform.OS === 'web') {
      return (
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackText}>
            Scratch pad works in Expo Go on a phone (finger draw). Open this
            session there to sketch.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.wrap}>
        <SignatureCanvas
          key={String(resetKey)}
          ref={canvasRef}
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
          webviewProps={{
            scrollEnabled: false,
            bounces: false,
            showsHorizontalScrollIndicator: false,
            showsVerticalScrollIndicator: false,
          }}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 180,
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
