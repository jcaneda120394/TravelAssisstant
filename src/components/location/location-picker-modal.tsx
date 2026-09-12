import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Modal } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { searchDestinations } from '@/services/geo/geocode.service';
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

const QUICK_PICKS = [
  'Malolos, Bulacan, Philippines',
  'Manila, Philippines',
  'Quezon City, Philippines',
  'Cebu City, Philippines',
  'Davao City, Philippines',
] as const;

export function LocationPickerModal({ visible, onClose, onChanged }: Props) {
  const scheme = useAppColorScheme();
  const [query, setQuery] = useState('Bulacan');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(query, 350);

  const suggestionsQuery = useQuery({
    queryKey: ['location-picker', debounced],
    enabled: visible && debounced.trim().length >= 2,
    queryFn: () => searchDestinations(debounced),
    staleTime: 60_000,
  });

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

  const applySuggestionLabel = async (label: string) => {
    setBusy(true);
    setError(null);
    try {
      const results = await searchDestinations(label);
      const first = results[0];
      if (!first) {
        throw new Error(`Could not find “${label}”`);
      }
      await setLocationFromSuggestion(first);
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
              subtitle="GPS or search any city worldwide"
            />
            <Pressable onPress={onClose} hitSlop={12}>
              <AppText className="font-sans-semibold text-brand-700">Close</AppText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Card className="mb-4">
              <AppText muted className="mb-3 text-sm">
                On iOS Simulator, GPS often stays on San Francisco. Set Features → Location → Custom
                Location, or pick your city below.
              </AppText>
              <Button label="Use device GPS" loading={busy} onPress={() => void applyGps()} />
              <View className="mt-2">
                <Button
                  label="Clear saved location"
                  variant="ghost"
                  onPress={() => {
                    void clearSavedLocation();
                    onChanged?.();
                  }}
                />
              </View>
            </Card>

            <AppText className="mb-2 font-sans-semibold">Quick picks</AppText>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {QUICK_PICKS.map((pick) => (
                <Pressable
                  key={pick}
                  disabled={busy}
                  onPress={() => void applySuggestionLabel(pick)}
                  className={`rounded-full border px-3 py-2 ${
                    scheme === 'dark'
                      ? 'border-brand-700 bg-brand-900'
                      : 'border-brand-200 bg-brand-50'
                  }`}
                >
                  <AppText className="text-sm">{pick.split(',')[0]}</AppText>
                </Pressable>
              ))}
            </View>

            <TextField
              label="Search city or province"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="words"
              placeholder="e.g. Bulacan, Philippines"
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
                  onPress={() => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await setLocationFromSuggestion(item);
                        onChanged?.();
                        onClose();
                      } catch (err) {
                        setError(getErrorMessage(err));
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
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
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
