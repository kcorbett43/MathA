import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { moduleById, packsForModule } from '@/content/packs';
import { formatMixLabel } from '@/lib/learnDrill';
import { colors } from '@/lib/theme';

export default function QuantLearnModuleUnitsScreen() {
  const params = useLocalSearchParams<{ moduleId?: string }>();
  const moduleId = Array.isArray(params.moduleId) ? params.moduleId[0] : params.moduleId;
  const mod = useMemo(() => moduleById(moduleId), [moduleId]);
  const packs = useMemo(() => packsForModule(moduleId), [moduleId]);

  if (!mod) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <View style={styles.missing}>
          <Text style={styles.title}>Module not found</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/quant/learn')}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Back to Learn</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.kicker}>Module {mod.order}</Text>
          <Text style={styles.title}>{mod.title}</Text>
          <Text style={styles.subtitle}>{mod.blurb}</Text>
        </View>

        <View style={styles.list}>
          {packs.map((pack) => (
            <Pressable
              key={pack.meta.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${pack.meta.title}`}
              onPress={() =>
                router.push({
                  pathname: '/quant/learn/[packId]',
                  params: { packId: pack.meta.id },
                })
              }
              style={({ pressed }) => [styles.unitRow, pressed && styles.pressed]}
            >
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{pack.meta.order}</Text>
              </View>
              <View style={styles.unitText}>
                <Text style={styles.unitLabel}>{pack.meta.title}</Text>
                <Text style={styles.unitBlurb}>{pack.meta.blurb}</Text>
                <Text style={styles.unitMeta}>{formatMixLabel(pack)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
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
  missing: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  intro: {
    gap: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.primary,
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
  unitRow: {
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
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  unitText: {
    flex: 1,
    gap: 4,
  },
  unitLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  unitBlurb: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  unitMeta: {
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
