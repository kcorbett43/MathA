import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

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
          headerStyle: { backgroundColor: '#F7F8FA' },
          headerTintColor: '#1A1D21',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F7F8FA' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'MathA', headerShown: false }} />
        <Stack.Screen name="drill" options={{ title: 'Drill', headerBackTitle: 'Home' }} />
        <Stack.Screen name="results" options={{ title: 'Results', headerBackVisible: false }} />
      </Stack>
    </>
  );
}
