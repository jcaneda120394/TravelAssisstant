import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

/** Always-visible escape hatch from auth screens back to guest Home. */
export function AuthBackToHomeBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useAppColorScheme();

  const goHome = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={{ paddingTop: Math.max(insets.top, 12) }} className="mb-2 px-5">
      <Pressable
        onPress={goHome}
        accessibilityRole="button"
        accessibilityLabel="Back to Home"
        testID="auth-back-home"
        className={`self-start rounded-2xl border px-3.5 py-2 ${
          scheme === 'dark'
            ? 'border-brand-700 bg-brand-900/50'
            : 'border-brand-200 bg-brand-50'
        }`}
      >
        <AppText className="font-sans-semibold text-sm text-brand-700 dark:text-brand-200">
          ← Back to Home
        </AppText>
      </Pressable>
    </View>
  );
}

export function goToGuestHome(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)');
}
