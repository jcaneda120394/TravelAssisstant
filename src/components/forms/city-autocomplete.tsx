import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import {
  searchDestinations,
  type DestinationSuggestion,
} from '@/services/geo/geocode.service';

type Props = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  /** Called when user picks a suggestion (good hook for auto-search). */
  onSelect?: (next: string, suggestion?: DestinationSuggestion) => void;
  placeholder?: string;
  nearLabel?: string | null;
  /** Bias remote search toward this location. */
  near?: { latitude: number; longitude: number } | null;
  /** Include POIs / landmarks (not only cities). */
  includePlaces?: boolean;
  /** Compact layout without the “Selected” chip (e.g. Directions To row). */
  compact?: boolean;
  testID?: string;
};

export function CityAutocomplete({
  label = 'City',
  value,
  onChange,
  onSelect,
  placeholder = 'Search city…',
  nearLabel,
  near = null,
  includePlaces = false,
  compact = false,
  testID,
}: Props) {
  const scheme = useAppColorScheme();
  const [query, setQuery] = useState(value);
  const [focused, setFocused] = useState(false);
  /** Hide dropdown after a pick so the form below (dates / generate) is reachable. */
  const [picked, setPicked] = useState(Boolean(value.trim()));
  const debounced = useDebouncedValue(query, 350);

  useEffect(() => {
    setQuery(value);
    // Only treat external/prefilled values as "picked". While focused, typing
    // updates `value` from the parent and must not hide the suggestion list.
    if (!focused) {
      setPicked(Boolean(value.trim()));
    } else if (!value.trim()) {
      setPicked(false);
    }
  }, [value, focused]);

  const suggestionsQuery = useQuery({
    queryKey: [
      'city-autocomplete',
      debounced,
      includePlaces,
      near?.latitude ?? null,
      near?.longitude ?? null,
    ],
    enabled: debounced.trim().length >= 2 && focused && !picked,
    queryFn: () =>
      searchDestinations(debounced, {
        includePlaces,
        near: near ?? undefined,
      }),
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const items = suggestionsQuery.data ?? [];
    if (includePlaces) {
      return items.slice(0, 8);
    }
    // Prefer real cities/regions; keep a few places only if nothing better.
    const cities = items.filter(
      (item) => item.kind === 'city' || item.kind === 'region' || item.kind === 'country',
    );
    return (cities.length ? cities : items).slice(0, 6);
  }, [suggestionsQuery.data, includePlaces]);

  const showList =
    focused && !picked && debounced.trim().length >= 2;

  const apply = (next: string, suggestion?: DestinationSuggestion) => {
    const cleaned = next.trim();
    if (cleaned.length < 2) {
      return;
    }
    setQuery(cleaned);
    setPicked(true);
    setFocused(false);
    Keyboard.dismiss();
    onChange(cleaned);
    onSelect?.(cleaned, suggestion);
  };

  return (
    <View className={compact ? 'z-20' : 'mb-4 z-10'} testID={testID}>
      {nearLabel && !compact ? (
        <Pressable
          onPress={() => apply(nearLabel.split(',')[0] ?? nearLabel)}
          className={`mb-3 rounded-2xl border px-3 py-2 ${
            scheme === 'dark' ? 'border-brand-700 bg-brand-900' : 'border-brand-200 bg-brand-50'
          }`}
        >
          <AppText className="text-sm font-sans-semibold">Use my location</AppText>
          <AppText muted className="text-xs">
            {nearLabel}
          </AppText>
        </Pressable>
      ) : null}

      <TextField
        label={label}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setPicked(false);
          onChange(text);
        }}
        onFocus={() => {
          setFocused(true);
          // Re-open suggestions when editing an existing value.
          if (query.trim().length >= 2) {
            setPicked(false);
          }
        }}
        autoCapitalize="words"
        autoCorrect={false}
        placeholder={placeholder}
        returnKeyType="search"
        onSubmitEditing={() => {
          const first = suggestions[0];
          if (first) {
            apply(first.shortName || first.label, first);
            return;
          }
          apply(query);
        }}
      />

      {!compact && picked && query.trim().length >= 2 ? (
        <View
          className={`mb-2 flex-row items-center justify-between rounded-2xl border px-3 py-2 ${
            scheme === 'dark' ? 'border-brand-700 bg-brand-900' : 'border-brand-200 bg-brand-50'
          }`}
        >
          <View className="flex-1 pr-2">
            <AppText className="text-xs font-sans-semibold uppercase tracking-wide text-brand-600">
              Selected
            </AppText>
            <AppText className="font-sans-semibold">{query.trim()}</AppText>
          </View>
          <Pressable
            onPress={() => {
              setPicked(false);
              setFocused(true);
              setQuery('');
              onChange('');
            }}
            hitSlop={8}
          >
            <AppText className="text-sm font-sans-medium text-brand-700">Change</AppText>
          </Pressable>
        </View>
      ) : null}

      {!compact && !picked ? (
        <AppText muted className="mb-2 text-xs">
          {includePlaces
            ? 'Type a place or city, then tap a result.'
            : 'Type a city name, then tap a result to continue.'}
        </AppText>
      ) : null}

      {showList ? (
        <View
          className={`max-h-64 overflow-hidden rounded-2xl border ${
            scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-brand-100 bg-white'
          }`}
        >
          {suggestionsQuery.isFetching && suggestions.length === 0 ? (
            <View className="items-center py-3">
              <ActivityIndicator />
            </View>
          ) : null}

          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => apply(item.shortName || item.label, item)}
              className={`border-t px-4 py-3 ${
                scheme === 'dark' ? 'border-brand-800' : 'border-brand-50'
              }`}
            >
              <AppText className="font-sans-semibold">{item.shortName}</AppText>
              <AppText muted className="text-sm">
                {item.label}
                {includePlaces ? ` · ${item.kind}` : ''}
              </AppText>
            </Pressable>
          ))}

          {!suggestionsQuery.isFetching &&
          suggestions.length === 0 &&
          debounced.trim().length >= 2 ? (
            <Pressable
              onPress={() => apply(debounced.trim())}
              className={`px-4 py-3 ${suggestions.length > 0 ? '' : ''}`}
            >
              <AppText className="font-sans-medium">
                {suggestionsQuery.isError ? 'Search failed — ' : ''}
                Use “{debounced.trim()}”
              </AppText>
              <AppText muted className="text-xs">
                {includePlaces
                  ? 'No matching places. Pick a result when available for accurate routes.'
                  : 'Continue with this name'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
