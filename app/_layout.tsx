import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ContentStoreProvider } from '@/lib/content/ContentStoreProvider';
import { colors } from '@/lib/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  return (
    <ContentStoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'MathA', headerShown: false }} />
        <Stack.Screen name="drill/index" options={{ title: 'Drill', headerBackTitle: 'Home' }} />
        <Stack.Screen
          name="drill/session"
          options={{ title: 'Drill', headerBackTitle: 'Drill' }}
        />
        <Stack.Screen name="results" options={{ title: 'Results', headerBackVisible: false }} />
        <Stack.Screen
          name="dashboard"
          options={{ title: 'Dashboard', headerBackTitle: 'Drill' }}
        />
        <Stack.Screen name="quant/index" options={{ title: 'Learn', headerBackTitle: 'Home' }} />
        <Stack.Screen
          name="quant/practice"
          options={{ title: 'Practice', headerBackTitle: 'Learn' }}
        />
        <Stack.Screen
          name="quant/learn/index"
          options={{ title: 'Collections', headerBackTitle: 'Learn' }}
        />
        <Stack.Screen
          name="quant/learn/collection/[collectionId]"
          options={{ title: 'Collection', headerBackTitle: 'Learn' }}
        />
        <Stack.Screen
          name="quant/learn/[packId]"
          options={{ title: 'Lesson', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="quant/learn/example"
          options={{ title: 'Example', headerBackTitle: 'Lesson' }}
        />
        <Stack.Screen
          name="quant/learn/cards"
          options={{ title: 'Review cards', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="quant/learn/import"
          options={{ title: 'Import', headerBackTitle: 'Collections' }}
        />
        <Stack.Screen
          name="quant/session"
          options={{ title: 'Practice', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="quant/review"
          options={{ title: 'Review', headerBackVisible: false }}
        />
      </Stack>
    </ContentStoreProvider>
  );
}
