import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  collectionById,
  collectionPath,
  countLeafPacks,
  resolveCollectionChildren,
} from '@/content/packs';
import { formatMixLabel } from '@/lib/learnDrill';
import { colors } from '@/lib/theme';

function paramString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function QuantLearnCollectionScreen() {
  const params = useLocalSearchParams<{ collectionId?: string }>();
  const collectionId = paramString(params.collectionId);
  const collection = useMemo(() => collectionById(collectionId), [collectionId]);
  const path = useMemo(() => collectionPath(collectionId), [collectionId]);
  const children = useMemo(
    () => (collection ? resolveCollectionChildren(collection) : []),
    [collection],
  );

  if (!collection) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <View style={styles.missing}>
          <Text style={styles.title}>Collection not found</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/quant/learn')}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Back to Collections</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.breadcrumbs} accessibilityRole="header">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Collections home"
            onPress={() => router.push('/quant/learn')}
            hitSlop={6}
          >
            <Text style={styles.crumbLink}>Collections</Text>
          </Pressable>
          {path.map((node, i) => {
            const isLast = i === path.length - 1;
            return (
              <View key={node.id} style={styles.crumbSeg}>
                <Text style={styles.crumbSep}>/</Text>
                {isLast ? (
                  <Text style={styles.crumbCurrent} numberOfLines={1}>
                    {node.title}
                  </Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Go to ${node.title}`}
                    onPress={() =>
                      router.push({
                        pathname: '/quant/learn/collection/[collectionId]',
                        params: { collectionId: node.id },
                      })
                    }
                    hitSlop={6}
                  >
                    <Text style={styles.crumbLink} numberOfLines={1}>
                      {node.title}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>{collection.title}</Text>
          {collection.blurb ? <Text style={styles.subtitle}>{collection.blurb}</Text> : null}
        </View>

        <View style={styles.list}>
          {children.map((child) => {
            if (child.kind === 'collection') {
              const leafCount = countLeafPacks(child.collection);
              return (
                <Pressable
                  key={`c-${child.collection.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open collection ${child.collection.title}`}
                  onPress={() =>
                    router.push({
                      pathname: '/quant/learn/collection/[collectionId]',
                      params: { collectionId: child.collection.id },
                    })
                  }
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={[styles.kindBadge, styles.kindCollection]}>
                    <Text style={[styles.kindText, styles.kindCollectionText]}>C</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{child.collection.title}</Text>
                    {child.collection.blurb ? (
                      <Text style={styles.rowBlurb}>{child.collection.blurb}</Text>
                    ) : null}
                    <Text style={styles.rowMeta}>
                      Collection · {leafCount} {leafCount === 1 ? 'unit' : 'units'}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            }

            const { pack } = child;
            const cardCount = pack.cards.length;
            return (
              <View key={`p-${pack.meta.id}`} style={styles.unitBlock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open unit ${pack.meta.title}`}
                  onPress={() =>
                    router.push({
                      pathname: '/quant/learn/[packId]',
                      params: { packId: pack.meta.id },
                    })
                  }
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.kindBadge}>
                    <Text style={styles.kindText}>{pack.meta.order}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{pack.meta.title}</Text>
                    <Text style={styles.rowBlurb}>{pack.meta.blurb}</Text>
                    <Text style={styles.rowMeta}>{formatMixLabel(pack)}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
                {cardCount > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Review ${cardCount} cards for ${pack.meta.title}`}
                    onPress={() =>
                      router.push({
                        pathname: '/quant/learn/cards',
                        params: { packId: pack.meta.id },
                      })
                    }
                    style={({ pressed }) => [styles.reviewLink, pressed && styles.pressed]}
                  >
                    <Text style={styles.reviewLinkText}>
                      Review cards · {cardCount}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
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
    gap: 20,
  },
  missing: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  breadcrumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  crumbSeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  crumbSep: {
    fontSize: 13,
    color: colors.muted,
  },
  crumbLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  crumbCurrent: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    maxWidth: 180,
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
  unitBlock: {
    gap: 8,
  },
  reviewLink: {
    alignSelf: 'flex-start',
    marginLeft: 46,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  reviewLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
  kindBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindCollection: {
    backgroundColor: colors.primary,
  },
  kindText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  kindCollectionText: {
    color: '#FFFFFF',
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
  primary: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.85,
  },
});
