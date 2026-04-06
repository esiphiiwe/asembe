import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import './globals.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { session, isLoading, isOnboarded } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onSignupScreen = segments[1] === 'signup';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/landing');
    } else if (session && !isOnboarded && !onSignupScreen) {
      router.replace('/(auth)/signup');
    } else if (session && isOnboarded && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isOnboarded, router, segments, session]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="activity/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="review/[matchId]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="chat/[matchId]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
