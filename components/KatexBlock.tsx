import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { KatexWebBlock } from '@/components/KatexWebBlock';
import { escapeOutsideMath, sanitizeCssColor } from '@/lib/katexHtml';
import { colors } from '@/lib/theme';

export { containsMathDelimiters, escapeOutsideMath } from '@/lib/katexHtml';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
};

const KATEX_VERSION = '0.19.1';
const FALLBACK_MS = 8000;

/**
 * Renders a text node that may contain `$…$` / `$$…$$` via KaTeX.
 * - Native (Expo Go): WebView + KaTeX CDN auto-render
 * - Web: katex.renderToString into the DOM (WebView unsupported on RN web)
 * On failure, falls back to the raw TeX string in a native Text.
 */
export function KatexBlock(props: Props) {
  if (Platform.OS === 'web') {
    return <KatexWebBlock {...props} />;
  }
  return <KatexNativeBlock {...props} />;
}

function KatexNativeBlock({ text, style }: Props) {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 16;
  const lineHeight =
    typeof flat.lineHeight === 'number' ? flat.lineHeight : Math.round(fontSize * 1.5);
  const color = typeof flat.color === 'string' ? flat.color : colors.subtle;
  const fontWeight = flat.fontWeight != null ? String(flat.fontWeight) : '400';

  const html = useMemo(
    () => buildKatexHtml({ text, fontSize, lineHeight, color, fontWeight }),
    [text, fontSize, lineHeight, color, fontWeight],
  );

  return (
    <KatexBlockInner
      key={html}
      text={text}
      style={style}
      html={html}
      lineHeight={lineHeight}
    />
  );
}

function KatexBlockInner({
  text,
  style,
  html,
  lineHeight,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  html: string;
  lineHeight: number;
}) {
  const estimated = Math.max(lineHeight, Math.ceil(text.split('\n').length) * lineHeight);
  const [height, setHeight] = useState(estimated);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!readyRef.current) setFailed(true);
    }, FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        height?: number;
      };
      if (payload.type === 'error') {
        setFailed(true);
        return;
      }
      if (payload.type === 'ready') {
        readyRef.current = true;
        setReady(true);
      }
      if (typeof payload.height === 'number' && payload.height > 0) {
        setHeight(Math.ceil(payload.height));
        readyRef.current = true;
        setReady(true);
      }
    } catch {
      // Ignore malformed messages; timeout / error path handles fallback.
    }
  }, []);

  if (failed) {
    return (
      <Text style={[styles.fallback, style]} accessibilityLabel="LaTeX (raw)">
        {text}
      </Text>
    );
  }

  return (
    <View style={[styles.wrap, { minHeight: height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webview, { height }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled
        automaticallyAdjustContentInsets={false}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onMessage={onMessage}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        {...(Platform.OS === 'android' ? { androidLayerType: 'hardware' as const } : null)}
      />
      {!ready ? (
        <View style={[styles.placeholder, { height: estimated }]} accessibilityElementsHidden />
      ) : null}
    </View>
  );
}

function buildKatexHtml({
  text,
  fontSize,
  lineHeight,
  color,
  fontWeight,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  fontWeight: string;
}): string {
  const body = escapeOutsideMath(text);
  const cdn = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist`;
  const safeColor = sanitizeCssColor(color, colors.subtle);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${cdn}/katex.min.css" crossorigin="anonymous" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
  }
  body {
    font-size: ${fontSize}px;
    line-height: ${lineHeight}px;
    color: ${safeColor};
    font-weight: ${fontWeight};
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    overflow-wrap: break-word;
    word-wrap: break-word;
  }
  .katex { font-size: 1.05em; }
  .katex-display { margin: 0.4em 0; overflow-x: auto; overflow-y: hidden; }
</style>
</head>
<body>
<div id="root">${body}</div>
<script>
  function post(msg) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    } catch (e) {}
  }
  function postHeight() {
    var h = Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0,
      document.getElementById('root') ? document.getElementById('root').scrollHeight : 0
    );
    if (h > 0) post({ type: 'height', height: h });
  }
  function renderAndReport() {
    try {
      if (typeof renderMathInElement !== 'function') {
        setTimeout(renderAndReport, 40);
        return;
      }
      renderMathInElement(document.getElementById('root'), {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\\\(', right: '\\\\)', display: false },
          { left: '\\\\[', right: '\\\\]', display: true }
        ],
        throwOnError: false,
        errorColor: '#C62828',
        strict: 'ignore'
      });
      post({ type: 'ready' });
      postHeight();
      setTimeout(postHeight, 60);
      setTimeout(postHeight, 200);
    } catch (e) {
      post({ type: 'error', message: String(e && e.message ? e.message : e) });
    }
  }
  window.addEventListener('error', function () {
    post({ type: 'error' });
  });
</script>
<script src="${cdn}/katex.min.js" crossorigin="anonymous"
  onerror="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}))"></script>
<script src="${cdn}/contrib/auto-render.min.js" crossorigin="anonymous"
  onload="renderAndReport()"
  onerror="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}))"></script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
  },
  webview: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  placeholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
  fallback: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.subtle,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
