import { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle, View } from 'react-native';

import { sanitizeCssColor } from '@/lib/katexHtml';
import { renderMathToHtml } from '@/lib/katexRender';
import { colors } from '@/lib/theme';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
};

const KATEX_CSS_ID = 'matha-katex-css';
const KATEX_CSS_HREF = 'https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css';

function ensureKatexCss(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KATEX_CSS_ID)) return;
  const link = document.createElement('link');
  link.id = KATEX_CSS_ID;
  link.rel = 'stylesheet';
  link.href = KATEX_CSS_HREF;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

/**
 * Web-only KaTeX renderer (DOM + katex package). Used when
 * react-native-webview is unavailable (expo web / RN web).
 */
export function KatexWebBlock({ text, style }: Props) {
  ensureKatexCss();

  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 16;
  const lineHeight =
    typeof flat.lineHeight === 'number' ? flat.lineHeight : Math.round(fontSize * 1.5);
  const color =
    typeof flat.color === 'string'
      ? sanitizeCssColor(flat.color, colors.subtle)
      : colors.subtle;
  const fontWeight = flat.fontWeight != null ? String(flat.fontWeight) : '400';

  const rendered = useMemo(() => renderMathToHtml(text), [text]);

  if (!rendered.ok) {
    return (
      <Text style={[styles.fallback, style]} accessibilityLabel="LaTeX (raw)">
        {text}
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <div
        dangerouslySetInnerHTML={{ __html: rendered.html }}
        style={{
          fontSize,
          lineHeight: `${lineHeight}px`,
          color,
          fontWeight: fontWeight as string,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          overflowWrap: 'break-word',
          wordWrap: 'break-word',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  fallback: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.subtle,
    fontFamily: 'monospace',
  },
});
