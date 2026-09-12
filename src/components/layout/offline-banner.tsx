import { AppText } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { useNetworkStatus } from '@/hooks/use-network-status';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <View className="bg-accent-500 px-4 py-2" testID="offline-banner">
      <AppText className="text-center font-sans-medium text-sm text-ink-light">
        You appear to be offline. Some features may be unavailable.
      </AppText>
    </View>
  );
}
