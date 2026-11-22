import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEARN_MODULES, packsForModule } from '@/content/packs';
import { colors } from '@/lib/theme';

export default function QuantLearnModulesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Learn</Text>
          <Text style={styles.subtitle}>
            Pick a module, then a unit. Lesson first, then a mixed drill. All units are open in
            v1 — finish in any order.
          </Text>
        </View>

        <View style={styles.list}>
          {LEARN_MODULES.map((mod) => {
            const unitCount = packsForModule(mod.id).length;
            return (
              <Pressable
                key={mod.id}
                accessibilityRole="button"
                accessibilityLabel={`Open module ${mod.title}`}
                onPress={() =>
                  router.push({
                    pathname: '/quant/learn/module/[moduleId]',
                    params: { moduleId: mod.id },
                  })
                }
                style={({ pressed }) => [styles.moduleRow, pressed && styles.pressed]}
              >
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{mod.order}</Text>
                </View>
                <View style={styles.moduleText}>
                  <Text style={styles.moduleLabel}>{mod.title}</Text>
                  <Text style={styles.moduleBlurb}>{mod.blurb}</Text>
                  <Text style={styles.moduleMeta}>
                    {unitCount} {unitCount === 1 ? 'unit' : 'units'}
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
  moduleRow: {
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
  moduleText: {
    flex: 1,
    gap: 4,
  },
  moduleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  moduleBlurb: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  moduleMeta: {
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
