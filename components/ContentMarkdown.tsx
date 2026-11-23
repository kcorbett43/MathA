import { Image, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { KatexBlock } from '@/components/KatexBlock';
import { resolveAssetUri, type AssetUriMap } from '@/content/store/assets';
import { containsMathDelimiters } from '@/lib/katexHtml';
import { colors } from '@/lib/theme';

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'image'; alt: string; src: string };

const IMAGE_RE = /!\[([^\]]*)]\(([^)]+)\)/g;

function splitContent(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  const re = new RegExp(IMAGE_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: 'text', value: text.slice(last, m.index) });
    }
    out.push({ kind: 'image', alt: m[1] ?? '', src: (m[2] ?? '').trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: 'text', value: text.slice(last) });
  }
  return out.length > 0 ? out : [{ kind: 'text', value: text }];
}

type Props = {
  text: string;
  /** Owning package asset map (from installed package). */
  assetUris?: AssetUriMap;
  style?: TextStyle;
};

/**
 * Constrained Markdown renderer for learner-facing strings.
 * Supports paragraphs, Markdown images (package-root-relative), and
 * KaTeX math via `$…$` / `$$…$$` (WebView; Expo Go compatible).
 * Math render failures fall back to the raw TeX source.
 */
export function ContentMarkdown({ text, assetUris, style }: Props) {
  if (!text) return null;
  const segments = splitContent(text);

  return (
    <View style={styles.wrap}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          const trimmed = seg.value.replace(/^\n+|\n+$/g, '');
          if (!trimmed) return null;
          if (containsMathDelimiters(trimmed)) {
            return <KatexBlock key={`m-${i}`} text={trimmed} style={[styles.text, style]} />;
          }
          return (
            <Text key={`t-${i}`} style={[styles.text, style]}>
              {trimmed}
            </Text>
          );
        }
        const uri = resolveAssetUri(assetUris, seg.src);
        if (!uri) {
          return (
            <Text key={`img-miss-${i}`} style={[styles.missing, style]}>
              [missing image: {seg.src}]
            </Text>
          );
        }
        return (
          <Image
            key={`i-${i}`}
            source={{ uri }}
            accessibilityLabel={seg.alt || 'Image'}
            style={styles.image}
            resizeMode="contain"
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.subtle,
  },
  missing: {
    fontSize: 14,
    color: '#B42318',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.chip,
  },
});
