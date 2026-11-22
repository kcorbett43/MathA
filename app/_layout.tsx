import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/lib/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  return (
    <>
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
        <Stack.Screen name="drill" options={{ title: 'Drill', headerBackTitle: 'Home' }} />
        <Stack.Screen name="results" options={{ title: 'Results', headerBackVisible: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard', headerBackTitle: 'Home' }} />
        <Stack.Screen name="quant/index" options={{ title: 'Quant', headerBackTitle: 'Home' }} />
        <Stack.Screen
          name="quant/practice"
          options={{ title: 'Practice', headerBackTitle: 'Quant' }}
        />
        <Stack.Screen
          name="quant/learn/index"
          options={{ title: 'Learn', headerBackTitle: 'Quant' }}
        />
        <Stack.Screen
          name="quant/learn/module/[moduleId]"
          options={{ title: 'Units', headerBackTitle: 'Learn' }}
        />
        <Stack.Screen
          name="quant/learn/[packId]"
          options={{ title: 'Lesson', headerBackTitle: 'Units' }}
        />
        <Stack.Screen name="quant/session" options={{ title: 'Quant', headerBackTitle: 'Back' }} />
        <Stack.Screen
          name="quant/review"
          options={{ title: 'Review', headerBackVisible: false }}
        />
      </Stack>
    </>
  );
}
