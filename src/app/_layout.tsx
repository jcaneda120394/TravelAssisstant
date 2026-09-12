import '../../global.css';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { useColorScheme as useSystemColorScheme, View } from 'react-native';
import 'react-native-reanimated';

import { OfflineBanner } from '@/components/layout/offline-banner';
import { theme } from '@/config/theme';
import { AuthGate } from '@/features/auth/auth-gate';
import { AppProviders } from '@/providers/app-providers';
import { useThemeStore } from '@/stores/theme-store';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const systemScheme = useSystemColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const { setColorScheme } = useNativeWindColorScheme();
  const resolved =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  useEffect(() => {
    setColorScheme(resolved);
    // NativeWind's setColorScheme identity can change every render — omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [resolved]);

  const navTheme =
    resolved === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: theme.dark.primary,
            background: theme.dark.background,
            card: theme.dark.surface,
            text: theme.dark.text,
            border: theme.dark.border,
            notification: theme.dark.accent,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: theme.light.primary,
            background: theme.light.background,
            card: theme.light.surface,
            text: theme.light.text,
            border: theme.light.border,
            notification: theme.light.accent,
          },
        };

  return (
    <ThemeProvider value={navTheme}>
      <View className="flex-1">
        <OfflineBanner />
        <AuthGate>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="place/[id]" options={{ title: 'Place' }} />
            <Stack.Screen name="directions" options={{ title: 'Directions' }} />
            <Stack.Screen name="hotels/index" options={{ title: 'Hotels' }} />
            <Stack.Screen name="hotels/[id]" options={{ title: 'Hotel' }} />
            <Stack.Screen name="trip/[id]" options={{ title: 'Trip' }} />
            <Stack.Screen name="currency" options={{ title: 'Currency' }} />
            <Stack.Screen name="budget" options={{ title: 'Budget' }} />
            <Stack.Screen name="esim" options={{ title: 'eSIM' }} />
            <Stack.Screen name="emergency" options={{ title: 'Emergency' }} />
            <Stack.Screen name="weather" options={{ title: 'Weather' }} />
            <Stack.Screen name="search" options={{ title: 'Search' }} />
            <Stack.Screen name="favorites" options={{ title: 'Favorites' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          </Stack>
        </AuthGate>
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      </View>
    </ThemeProvider>
  );
}
