import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

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
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function DestinationAutocomplete({
  label = 'Destinations',
  values,
  onChange,
  placeholder = 'Search any city or country…',
}: Props) {
  const scheme = useAppColorScheme();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 350);

  const suggestionsQuery = useQuery({
    queryKey: ['destination-autocomplete', debounced],
    enabled: debounced.trim().length >= 2,
    queryFn: () => searchDestinations(debounced),
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const selected = new Set(values.map((value) => value.toLowerCase()));
    return (suggestionsQuery.data ?? []).filter(
      (item) => !selected.has(item.label.toLowerCase()) && !selected.has(item.shortName.toLowerCase()),
    );
  }, [suggestionsQuery.data, values]);

  const addSuggestion = (item: DestinationSuggestion) => {
    const nextLabel = item.label;
    if (values.some((value) => value.toLowerCase() === nextLabel.toLowerCase())) {
      setQuery('');
      return;
    }
    onChange([...values, nextLabel]);
    setQuery('');
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  const addFreeText = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    if (!values.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...values, trimmed]);
    }
    setQuery('');
  };

  return (
    <View className="mb-4">
      <TextField
        label={label}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="words"
        autoCorrect={false}
        placeholder={placeholder}
        returnKeyType="done"
        onSubmitEditing={addFreeText}
      />

      {values.length ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {values.map((value) => (
            <Pressable
              key={value}
              onPress={() => removeValue(value)}
              className={`rounded-full border px-3 py-2 ${
                scheme === 'dark'
                  ? 'border-brand-700 bg-brand-900'
                  : 'border-brand-200 bg-brand-50'
              }`}
            >
              <AppText className="text-sm font-sans-medium">{value} ×</AppText>
            </Pressable>
          ))}
        </View>
      ) : (
        <AppText muted className="mb-2 text-xs">
          Type to search cities and countries worldwide, then tap a result.
        </AppText>
      )}

      {debounced.trim().length >= 2 ? (
        <View
          className={`overflow-hidden rounded-2xl border ${
            scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-brand-100 bg-white'
          }`}
        >
          {suggestionsQuery.isFetching ? (
            <View className="items-center py-3">
              <ActivityIndicator />
            </View>
          ) : null}

          {!suggestionsQuery.isFetching && suggestions.length === 0 ? (
            <Pressable onPress={addFreeText} className="px-4 py-3">
              <AppText className="font-sans-medium">Use “{debounced.trim()}”</AppText>
              <AppText muted className="text-xs">
                No match found — save as custom destination
              </AppText>
            </Pressable>
          ) : null}

          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => addSuggestion(item)}
              className={`border-t px-4 py-3 ${
                scheme === 'dark' ? 'border-brand-800' : 'border-brand-50'
              }`}
            >
              <AppText className="font-sans-semibold">{item.shortName}</AppText>
              <AppText muted className="text-sm">
                {item.label} · {item.kind}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
