import { Link, Stack } from 'expo-router';

import { AppText, Screen } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen className="items-center justify-center px-6">
        <View className="items-center gap-3">
          <AppText className="font-sans-bold text-2xl">Screen not found</AppText>
          <AppText muted>This route is not part of TravelAssistant yet.</AppText>
          <Link href="/">
            <AppText className="font-sans-semibold text-brand-600">Go home</AppText>
          </Link>
        </View>
      </Screen>
    </>
  );
}
