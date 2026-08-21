/**
 * Root Layout - Wraps the entire app with AuthProvider
 * Expo Router uses this as the root component
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="discover/[id]"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="booking"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="messages"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </AuthProvider>
  );
}
