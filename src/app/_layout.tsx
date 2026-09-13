import '../../global.css';

import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
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
import { Platform, useColorScheme as useSystemColorScheme, View } from 'react-native';
import 'react-native-reanimated';

import { OfflineBanner } from '@/components/layout/offline-banner';
import { AuthGate } from '@/features/auth/auth-gate';
import { useCountryAppearance } from '@/hooks/use-country-appearance';
import { AppProviders } from '@/providers/app-providers';
import { useThemeStore } from '@/stores/theme-store';
import { vars } from 'nativewind';

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
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Never leave users on a blank splash if fonts hang.
  useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!loaded && !error) {
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
  const { colors, cssVars } = useCountryAppearance();
  const resolved =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  useEffect(() => {
    setColorScheme(resolved);
    // Web: Tailwind `darkMode: 'class'` needs `dark` on <html> for dark: utilities.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.toggle('dark', resolved === 'dark');
      root.style.colorScheme = resolved;
    }
    // NativeWind's setColorScheme identity can change every render — omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [resolved]);

  // Web: mirror theme CSS variables onto :root so brand tokens update outside RN Web nodes.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }
  }, [cssVars]);

  const navTheme =
    resolved === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: colors.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.accent,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: colors.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.accent,
          },
        };

  return (
    <ThemeProvider value={navTheme}>
      <View className="flex-1" style={vars(cssVars)}>
        <OfflineBanner />
        <AuthGate>
          <Stack
            screenOptions={{
              headerBackTitle: 'Back',
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                title: 'Home',
              }}
            />
            <Stack.Screen name="place/[id]" options={{ title: 'Place details' }} />
            <Stack.Screen name="directions" options={{ title: 'Directions' }} />
            <Stack.Screen name="hotels/index" options={{ title: 'Hotels' }} />
            <Stack.Screen name="hotels/[id]" options={{ title: 'Hotel' }} />
            <Stack.Screen name="trip/[id]" options={{ title: 'Trip' }} />
            <Stack.Screen name="create-trip" options={{ title: 'Create Trip' }} />
            <Stack.Screen name="trip-suggestions" options={{ title: 'Trip Suggestions' }} />
            <Stack.Screen name="trip-suggestion" options={{ title: 'Trip Suggestion' }} />
            <Stack.Screen name="currency" options={{ title: 'Currency' }} />
            <Stack.Screen name="budget" options={{ title: 'Budget' }} />
            <Stack.Screen name="esim" options={{ title: 'eSIM' }} />
            <Stack.Screen name="emergency" options={{ title: 'Emergency' }} />
            <Stack.Screen name="weather" options={{ title: 'Weather' }} />
            <Stack.Screen name="search" options={{ title: 'Search' }} />
            <Stack.Screen name="favorites" options={{ title: 'Favorites' }} />
            <Stack.Screen name="travel-spots" options={{ title: 'Travel Guide' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          </Stack>
        </AuthGate>
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      </View>
    </ThemeProvider>
  );
}
