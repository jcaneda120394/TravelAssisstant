import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { providers } from '@/providers/registry';
import { searchDestinations } from '@/services/geo/geocode.service';
import type { GeoPoint, Place } from '@/types/domain';

type Props = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  onSelectPlace?: (place: Place | null) => void;
  selectedPlace?: Place | null;
  near?: GeoPoint | null;
  nearLabel?: string | null;
  placeholder?: string;
  testID?: string;
};

function destinationToPlace(item: {
  id: string;
  label: string;
  shortName: string;
  kind: string;
  latitude: number;
  longitude: number;
}): Place {
  return {
    id: item.id,
    provider: 'geocode',
    providerPlaceId: item.id,
    name: item.shortName || item.label,
    category: item.kind === 'place' ? 'attraction' : 'other',
    latitude: item.latitude,
    longitude: item.longitude,
    address: item.label,
  };
}

export function PlaceSearchField({
  label = 'Search place or attraction',
  value,
  onChange,
  onSelectPlace,
  selectedPlace = null,
  near = null,
  nearLabel = null,
  placeholder = 'e.g. Ngong Ping, Victoria Peak…',
  testID,
}: Props) {
  const scheme = useAppColorScheme();
  const [query, setQuery] = useState(value);
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState(Boolean(selectedPlace || value.trim()));
  const debounced = useDebouncedValue(query, 350);

  useEffect(() => {
    setQuery(value);
    if (!focused) {
      setPicked(Boolean(selectedPlace || value.trim()));
    } else if (!value.trim()) {
      setPicked(false);
    }
  }, [value, focused, selectedPlace]);

  const placesQuery = useQuery({
    queryKey: [
      'place-search-field',
      debounced,
      near?.latitude ?? null,
      near?.longitude ?? null,
    ],
    enabled: debounced.trim().length >= 2 && focused && !picked,
    queryFn: async () => {
      const q = debounced.trim();
      const [providerPlaces, destinations] = await Promise.all([
        providers.places.searchPlaces({
          query: q,
          location: near ?? undefined,
          limit: 10,
        }),
        searchDestinations(q, {
          includePlaces: true,
          near: near ?? undefined,
        }),
      ]);

      const merged: Place[] = [];
      const seen = new Set<string>();

      for (const place of providerPlaces) {
        const key = `${place.name.toLowerCase()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(place);
      }

      for (const dest of destinations) {
        const place = destinationToPlace(dest);
        const key = `${place.name.toLowerCase()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(place);
      }

      return merged.slice(0, 12);
    },
    staleTime: 60_000,
  });

  const results = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const showList = focused && !picked && debounced.trim().length >= 2;

  const applyPlace = (place: Place) => {
    setQuery(place.name);
    setPicked(true);
    setFocused(false);
    Keyboard.dismiss();
    onChange(place.name);
    onSelectPlace?.(place);
  };

  const applyCustom = (title: string) => {
    const cleaned = title.trim();
    if (cleaned.length < 2) return;
    setQuery(cleaned);
    setPicked(true);
    setFocused(false);
    Keyboard.dismiss();
    onChange(cleaned);
    onSelectPlace?.(null);
  };

  return (
    <View className="mb-4 z-10" testID={testID}>
      {nearLabel ? (
        <AppText muted className="mb-2 text-xs">
          Searching near {nearLabel}
        </AppText>
      ) : null}

      <TextField
        label={label}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setPicked(false);
          onChange(text);
          onSelectPlace?.(null);
        }}
        onFocus={() => {
          setFocused(true);
          if (query.trim().length >= 2) {
            setPicked(false);
          }
        }}
        autoCapitalize="words"
        autoCorrect={false}
        placeholder={placeholder}
        returnKeyType="search"
        onSubmitEditing={() => {
          if (results[0]) {
            applyPlace(results[0]);
            return;
          }
          applyCustom(query);
        }}
      />

      {picked && (selectedPlace || query.trim().length >= 2) ? (
        <View
          className={`mb-2 flex-row items-center justify-between rounded-2xl border px-3 py-2 ${
            scheme === 'dark' ? 'border-brand-700 bg-brand-900' : 'border-brand-200 bg-brand-50'
          }`}
        >
          <View className="flex-1 pr-2">
            <AppText className="text-xs font-sans-semibold uppercase tracking-wide text-brand-600">
              {selectedPlace ? 'Selected place' : 'Custom title'}
            </AppText>
            <AppText className="font-sans-semibold">{selectedPlace?.name ?? query.trim()}</AppText>
            {selectedPlace?.address ? (
              <AppText muted className="text-xs" numberOfLines={2}>
                {selectedPlace.address}
              </AppText>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              setPicked(false);
              setFocused(true);
              setQuery('');
              onChange('');
              onSelectPlace?.(null);
            }}
            hitSlop={8}
          >
            <AppText className="text-sm font-sans-medium text-brand-700">Change</AppText>
          </Pressable>
        </View>
      ) : (
        <AppText muted className="mb-2 text-xs">
          Type a place, attraction, restaurant, or hotel — then tap a result.
        </AppText>
      )}

      {showList ? (
        <View
          className={`max-h-72 overflow-hidden rounded-2xl border ${
            scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-brand-100 bg-white'
          }`}
        >
          {placesQuery.isFetching && results.length === 0 ? (
            <View className="items-center py-3">
              <ActivityIndicator />
            </View>
          ) : null}

          {results.map((place) => (
            <Pressable
              key={place.id}
              onPress={() => applyPlace(place)}
              className={`border-t px-4 py-3 ${
                scheme === 'dark' ? 'border-brand-800' : 'border-brand-50'
              }`}
            >
              <AppText className="font-sans-semibold">{place.name}</AppText>
              <AppText muted className="text-sm">
                {[place.category?.replace('_', ' '), place.address].filter(Boolean).join(' · ')}
              </AppText>
            </Pressable>
          ))}

          {!placesQuery.isFetching && results.length === 0 && debounced.trim().length >= 2 ? (
            <Pressable onPress={() => applyCustom(debounced.trim())} className="px-4 py-3">
              <AppText className="font-sans-medium">
                {placesQuery.isError ? 'Search failed — ' : ''}
                Use “{debounced.trim()}”
              </AppText>
              <AppText muted className="text-xs">
                Add as a custom activity title
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
