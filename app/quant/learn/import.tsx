import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ImportPreview } from '@/content/matha';
import {
  EXAMPLE_PACKAGES,
  loadExamplePackageBytes,
  type ExamplePackage,
} from '@/content/matha/examplePackages';
import { useContentStore } from '@/lib/content/ContentStoreProvider';
import { colors } from '@/lib/theme';

async function readPickedBytes(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  return file.bytes();
}

export default function MathaImportScreen() {
  const { ready, prepareMatha, installMatha } = useContentStore();
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const previewBytes = async (data: Uint8Array) => {
    setBytes(data);
    const p = prepareMatha(data);
    setPreview(p);
    if (!p.canInstall && p.installed?.contentUnchanged) {
      setStatus('Same revision and content — install would be a no-op.');
    } else {
      setStatus(null);
    }
  };

  const pickFile = async () => {
    setStatus(null);
    setPreview(null);
    setBytes(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      setBusy(true);
      const data = await readPickedBytes(asset.uri);
      await previewBytes(data);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const loadExample = async (pkg: ExamplePackage) => {
    setStatus(null);
    setPreview(null);
    setBytes(null);
    try {
      setBusy(true);
      const data = await loadExamplePackageBytes(pkg);
      await previewBytes(data);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    if (!bytes || !preview?.canInstall) return;
    try {
      setBusy(true);
      const result = await installMatha(bytes, { parentCollectionId: null });
      if (result.status === 'noop') {
        setStatus('No-op: same revision and content already installed.');
      } else if (result.status === 'installed') {
        setStatus(`Installed ${result.preview.packageId} r${result.preview.revision}.`);
        setTimeout(() => router.replace('/quant/learn'), 600);
      } else {
        setPreview(result.preview);
        setStatus('Install blocked — see validation issues.');
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Import .matha</Text>
        <Text style={styles.subtitle}>
          Preview a learning package, choose placement (Learn home for v1), then install
          atomically into your content library.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={!ready || busy}
          onPress={() => void pickFile()}
          style={({ pressed }) => [
            styles.primary,
            (!ready || busy) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryText}>{busy ? 'Working…' : 'Choose .matha file'}</Text>
        </Pressable>

        <View style={styles.examples}>
          <Text style={styles.sectionTitle}>Example packages</Text>
          <Text style={styles.muted}>
            Load a bundled sample (works on web when file picker is unavailable).
          </Text>
          {EXAMPLE_PACKAGES.map((pkg) => (
            <Pressable
              key={pkg.id}
              accessibilityRole="button"
              disabled={!ready || busy}
              onPress={() => void loadExample(pkg)}
              style={({ pressed }) => [
                styles.secondary,
                (!ready || busy) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryText}>{pkg.title}</Text>
            </Pressable>
          ))}
        </View>

        {preview ? (
          <View style={styles.preview}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <Text style={styles.row}>
              {preview.title ?? preview.packageId} · revision {preview.revision}
            </Text>
            {preview.attribution?.author ? (
              <Text style={styles.muted}>Author: {preview.attribution.author}</Text>
            ) : null}
            {preview.installed ? (
              <Text style={styles.muted}>
                Installed revision {preview.installed.revision}
                {preview.installed.contentUnchanged ? ' (unchanged)' : ''}
              </Text>
            ) : (
              <Text style={styles.muted}>Not installed yet</Text>
            )}
            <Text style={styles.sectionTitle}>Units</Text>
            {preview.unitSummaries.map((u) => (
              <Text key={u.id} style={styles.row}>
                {u.title}
                {' — '}
                {[
                  u.hasLesson ? 'lesson' : null,
                  u.hasPractice ? 'practice' : null,
                  u.hasReview ? 'review' : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            ))}
            {preview.issues.length > 0 ? (
              <View style={styles.issues}>
                <Text style={styles.sectionTitle}>Validation</Text>
                {preview.issues.map((issue, i) => (
                  <Text
                    key={`${issue.code}-${i}`}
                    style={issue.level === 'error' ? styles.error : styles.warn}
                  >
                    [{issue.level}] {issue.message}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.ok}>Validation passed</Text>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={!preview.canInstall || busy}
              onPress={() => void install()}
              style={({ pressed }) => [
                styles.primary,
                (!preview.canInstall || busy) && styles.disabled,
                pressed && preview.canInstall && styles.pressed,
              ]}
            >
              <Text style={styles.primaryText}>
                {preview.installed ? 'Update / reimport' : 'Install to Learn home'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  examples: { gap: 10 },
  secondary: {
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  preview: { gap: 8, marginTop: 8 },
  sectionTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: { fontSize: 15, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 14, color: colors.muted },
  issues: { gap: 6 },
  error: { fontSize: 14, color: '#B42318', lineHeight: 20 },
  warn: { fontSize: 14, color: '#B54708', lineHeight: 20 },
  ok: { fontSize: 14, fontWeight: '600', color: colors.primary },
  status: { fontSize: 15, color: colors.text, marginTop: 8 },
});
