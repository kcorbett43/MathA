import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { countLeafPacks, rootCollections } from '@/content/packs';
import { useContentStore } from '@/lib/content/ContentStoreProvider';
import { colors } from '@/lib/theme';

export default function QuantLearnHomeScreen() {
  const { snapshot, ready } = useContentStore();
  const roots = useMemo(() => rootCollections(), [snapshot]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Collections</Text>
          <Text style={styles.subtitle}>
            Browse the library, open a collection, then a unit. All units are open in v1 — finish in
            any order.
          </Text>
        </View>

        {!ready ? <Text style={styles.subtitle}>Loading library…</Text> : null}

        <View style={styles.list}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Import a MathA package"
            onPress={() => router.push('/quant/learn/import')}
            style={({ pressed }) => [styles.row, styles.importRow, pressed && styles.pressed]}
          >
            <View style={[styles.orderBadge, styles.importBadge]}>
              <Text style={styles.importBadgeText}>↓</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Import .matha</Text>
              <Text style={styles.rowBlurb}>Install a package into this library</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          {roots.map((collection, index) => {
            const leafCount = countLeafPacks(collection);
            return (
              <Pressable
                key={collection.id}
                accessibilityRole="button"
                accessibilityLabel={`Open collection ${collection.title}`}
                onPress={() =>
                  router.push({
                    pathname: '/quant/learn/collection/[collectionId]',
                    params: { collectionId: collection.id },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{collection.title}</Text>
                  {collection.blurb ? (
                    <Text style={styles.rowBlurb}>{collection.blurb}</Text>
                  ) : null}
                  <Text style={styles.rowMeta}>
                    {leafCount} {leafCount === 1 ? 'unit' : 'units'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 24,
  },
  intro: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 360,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  importRow: {
    borderColor: colors.primary,
    backgroundColor: colors.chip,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBadge: {
    backgroundColor: colors.primary,
  },
  importBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  rowBlurb: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  rowMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 28,
    color: colors.muted,
    lineHeight: 28,
  },
  pressed: {
    opacity: 0.85,
  },
});
