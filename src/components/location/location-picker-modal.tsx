import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import {
  searchDestinations,
  type DestinationSuggestion,
} from '@/services/geo/geocode.service';
import {
  clearSavedLocation,
  getCurrentPosition,
  setLocationFromSuggestion,
} from '@/services/location/location.service';
import { unlockWebBodyScroll } from '@/utils/unlock-web-body';
import { getErrorMessage } from '@/lib/errors/app-error';
import { notifyAlert } from '@/lib/notify-alert';

type Props = {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

const QUICK_PICKS: DestinationSuggestion[] = [
  {
    id: 'quick-villa-belissa',
    label: 'Villa Belissa, San Jose del Monte, Bulacan, Philippines',
    shortName: 'Villa Belissa',
    kind: 'place',
    latitude: 14.842187,
    longitude: 121.045478,
    countryCode: 'PH',
  },
  {
    id: 'quick-sjdm',
    label: 'San Jose del Monte, Bulacan, Philippines',
    shortName: 'San Jose del Monte',
    kind: 'city',
    latitude: 14.8139,
    longitude: 121.0453,
    countryCode: 'PH',
  },
  {
    id: 'quick-manila',
    label: 'Manila, Metro Manila, Philippines',
    shortName: 'Manila',
    kind: 'city',
    latitude: 14.5995,
    longitude: 120.9842,
    countryCode: 'PH',
  },
  {
    id: 'quick-qc',
    label: 'Quezon City, Metro Manila, Philippines',
    shortName: 'Quezon City',
    kind: 'city',
    latitude: 14.676,
    longitude: 121.0437,
    countryCode: 'PH',
  },
  {
    id: 'quick-tokyo',
    label: 'Tokyo, Japan',
    shortName: 'Tokyo',
    kind: 'city',
    latitude: 35.6762,
    longitude: 139.6503,
    countryCode: 'JP',
  },
  {
    id: 'quick-osaka',
    label: 'Osaka, Japan',
    shortName: 'Osaka',
    kind: 'city',
    latitude: 34.6937,
    longitude: 135.5023,
    countryCode: 'JP',
  },
  {
    id: 'quick-seoul',
    label: 'Seoul, South Korea',
    shortName: 'Seoul',
    kind: 'city',
    latitude: 37.5665,
    longitude: 126.978,
    countryCode: 'KR',
  },
  {
    id: 'quick-bangkok',
    label: 'Bangkok, Thailand',
    shortName: 'Bangkok',
    kind: 'city',
    latitude: 13.7563,
    longitude: 100.5018,
    countryCode: 'TH',
  },
  {
    id: 'quick-singapore',
    label: 'Singapore',
    shortName: 'Singapore',
    kind: 'city',
    latitude: 1.3521,
    longitude: 103.8198,
    countryCode: 'SG',
  },
  {
    id: 'quick-hk',
    label: 'Hong Kong',
    shortName: 'Hong Kong',
    kind: 'city',
    latitude: 22.3193,
    longitude: 114.1694,
    countryCode: 'HK',
  },
  {
    id: 'quick-paris',
    label: 'Paris, France',
    shortName: 'Paris',
    kind: 'city',
    latitude: 48.8566,
    longitude: 2.3522,
    countryCode: 'FR',
  },
  {
    id: 'quick-london',
    label: 'London, United Kingdom',
    shortName: 'London',
    kind: 'city',
    latitude: 51.5074,
    longitude: -0.1278,
    countryCode: 'GB',
  },
  {
    id: 'quick-nyc',
    label: 'New York, United States',
    shortName: 'New York',
    kind: 'city',
    latitude: 40.7128,
    longitude: -74.006,
    countryCode: 'US',
  },
  {
    id: 'quick-cebu',
    label: 'Cebu City, Cebu, Philippines',
    shortName: 'Cebu City',
    kind: 'city',
    latitude: 10.3157,
    longitude: 123.8854,
    countryCode: 'PH',
  },
  {
    id: 'quick-davao',
    label: 'Davao City, Davao del Sur, Philippines',
    shortName: 'Davao City',
    kind: 'city',
    latitude: 7.1907,
    longitude: 125.4553,
    countryCode: 'PH',
  },
  {
    id: 'quick-hanoi',
    label: 'Hanoi, Vietnam',
    shortName: 'Hanoi',
    kind: 'city',
    latitude: 21.0285,
    longitude: 105.8542,
    countryCode: 'VN',
  },
  {
    id: 'quick-sapa',
    label: 'Sa Pa, Lao Cai, Vietnam',
    shortName: 'Sa Pa',
    kind: 'city',
    latitude: 22.3364,
    longitude: 103.8438,
    countryCode: 'VN',
  },
  {
    id: 'quick-hcmc',
    label: 'Ho Chi Minh City, Vietnam',
    shortName: 'Ho Chi Minh City',
    kind: 'city',
    latitude: 10.8231,
    longitude: 106.6297,
    countryCode: 'VN',
  },
];

export function LocationPickerModal({ visible, onClose, onChanged }: Props) {
  const scheme = useAppColorScheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(query, 350);

  const suggestionsQuery = useQuery({
    queryKey: ['location-picker', 'v2-world', debounced],
    enabled: visible && debounced.trim().length >= 2,
    queryFn: () => searchDestinations(debounced),
    staleTime: 60_000,
  });

  // RN web Modal can leave body scroll locked after close — unlock explicitly.
  useEffect(() => {
    if (visible) return;
    const t = requestAnimationFrame(() => unlockWebBodyScroll());
    const t2 = setTimeout(() => unlockWebBodyScroll(), 50);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(t2);
    };
  }, [visible]);

  const applySuggestion = async (item: DestinationSuggestion) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    // Close immediately so mobile web never sits behind a frozen sheet.
    onClose();
    try {
      await setLocationFromSuggestion(item);
      setQuery('');
      requestAnimationFrame(() => {
        onChanged?.();
      });
    } catch (err) {
      notifyAlert('Could not set location', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const applyGps = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Keep the sheet open on web until GPS finishes — browsers only show the
      // permission prompt reliably while still inside the user-gesture path.
      await getCurrentPosition();
      setQuery('');
      onClose();
      requestAnimationFrame(() => {
        onChanged?.();
      });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      notifyAlert('Location needed', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss location picker"
        />
        <View
          className="max-h-[90%] rounded-t-3xl bg-white px-5 pt-4 dark:bg-surface-cardDark"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <SectionHeader
              title="Set your location"
              subtitle="Use precise GPS or search any city"
            />
            <Pressable onPress={onClose} hitSlop={12}>
              <AppText className="font-sans-semibold text-brand-700">Close</AppText>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
            style={Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as object) : undefined}
          >
            <Card className="mb-4">
              <AppText muted className="mb-3 text-sm">
                On web, allow location when your browser asks. This replaces any previously chosen
                city (for example Singapore) with your GPS position.
              </AppText>
              <Button
                label={busy ? 'Getting precise location…' : 'Use precise device GPS'}
                loading={busy}
                onPress={() => void applyGps()}
              />
              <View className="mt-2">
                <Button
                  label="Clear saved location"
                  variant="ghost"
                  loading={busy}
                  onPress={() => {
                    void (async () => {
                      if (busy) return;
                      setBusy(true);
                      setError(null);
                      onClose();
                      try {
                        await clearSavedLocation();
                        requestAnimationFrame(() => {
                          onChanged?.();
                        });
                      } catch (err) {
                        notifyAlert('Could not clear location', getErrorMessage(err));
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                />
              </View>
            </Card>

            <AppText className="mb-2 font-sans-semibold">Quick picks</AppText>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {QUICK_PICKS.map((pick) => (
                <Pressable
                  key={pick.id}
                  disabled={busy}
                  onPress={() => void applySuggestion(pick)}
                  className={`rounded-full border px-3 py-2 ${
                    scheme === 'dark'
                      ? 'border-brand-700 bg-brand-900'
                      : 'border-brand-200 bg-brand-50'
                  }`}
                >
                  <AppText className="text-sm">{pick.shortName}</AppText>
                </Pressable>
              ))}
            </View>

            <TextField
              label="Search city or province"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="words"
              placeholder="e.g. Sa Pa Vietnam, Tokyo, Bulacan"
              returnKeyType="search"
              blurOnSubmit
            />

            {error ? (
              <AppText className="mb-3 text-sm text-red-500">{error}</AppText>
            ) : null}

            <View
              className={`overflow-hidden rounded-2xl border ${
                scheme === 'dark' ? 'border-brand-800' : 'border-brand-100'
              }`}
            >
              {suggestionsQuery.isFetching ? (
                <View className="items-center py-4">
                  <ActivityIndicator />
                </View>
              ) : null}
              {(suggestionsQuery.data ?? []).map((item) => (
                <Pressable
                  key={item.id}
                  disabled={busy}
                  onPress={() => void applySuggestion(item)}
                  className={`border-t px-4 py-3 ${
                    scheme === 'dark' ? 'border-brand-800' : 'border-brand-50'
                  }`}
                >
                  <AppText className="font-sans-semibold">{item.shortName}</AppText>
                  <AppText muted className="text-sm">
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
              {!suggestionsQuery.isFetching &&
              debounced.trim().length >= 2 &&
              (suggestionsQuery.data?.length ?? 0) === 0 ? (
                <View className="px-4 py-3">
                  <AppText muted className="text-sm">
                    No matches. Try a quick pick above.
                  </AppText>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
