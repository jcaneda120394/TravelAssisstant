import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Modal } from 'react-native';

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
import { getErrorMessage } from '@/lib/errors/app-error';

type Props = {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

const QUICK_PICKS: DestinationSuggestion[] = [
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

  const applySuggestion = async (item: DestinationSuggestion) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setLocationFromSuggestion(item);
      onChanged?.();
      setQuery('');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const applyGps = async () => {
    setBusy(true);
    setError(null);
    try {
      await getCurrentPosition();
      onChanged?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-8 pt-4 dark:bg-surface-cardDark">
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
          >
            <Card className="mb-4">
              <AppText muted className="mb-3 text-sm">
                With location permission on, we use your device GPS and reverse-geocode the exact
                city or area around you.
              </AppText>
              <Button
                label="Use precise device GPS"
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
                      setBusy(true);
                      setError(null);
                      try {
                        await clearSavedLocation();
                        onChanged?.();
                        onClose();
                      } catch (err) {
                        setError(getErrorMessage(err));
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
