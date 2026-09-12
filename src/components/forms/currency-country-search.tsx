import { useMemo, useState } from 'react';

import { TextField } from '@/components/forms/text-field';
import { AppText } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { getCurrencySymbol, searchFxCurrencies } from '@/constants/fx-currencies';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type Props = {
  value: string;
  onChange: (code: string) => void;
  excludeCode?: string;
  /** When true, search box is focused for immediate typing. */
  autoFocus?: boolean;
  /** Max height class for the results list. */
  listClassName?: string;
};

/** Shared country/currency search list (no modal). */
export function CurrencyCountrySearch({
  value,
  onChange,
  excludeCode,
  autoFocus = false,
  listClassName = 'max-h-72',
}: Props) {
  const scheme = useAppColorScheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const results = searchFxCurrencies(query, 40);
    if (!excludeCode) return results;
    return results.filter((item) => item.code !== excludeCode.toUpperCase());
  }, [query, excludeCode]);

  return (
    <View>
      <TextField
        label="Country or currency"
        value={query}
        onChangeText={setQuery}
        placeholder="Search Japan, Philippines, USD…"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
      />
      <ScrollView
        className={listClassName}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {filtered.map((item) => {
          const active = item.code === value.toUpperCase();
          return (
            <Pressable
              key={`${item.code}-${item.country}`}
              onPress={() => onChange(item.code)}
              className={`mb-2 rounded-2xl border px-4 py-3 ${
                active
                  ? 'border-brand-600 bg-brand-600'
                  : scheme === 'dark'
                    ? 'border-brand-800'
                    : 'border-brand-100'
              }`}
            >
              <AppText
                className={`font-sans-semibold ${active ? 'text-white' : ''}`}
                inverse={active}
              >
                {item.country}
              </AppText>
              <AppText
                className={`mt-0.5 text-xs ${active ? 'text-brand-100' : ''}`}
                muted={!active}
                inverse={active}
              >
                {getCurrencySymbol(item.code)} {item.code} · {item.currencyName}
              </AppText>
            </Pressable>
          );
        })}
        {filtered.length === 0 ? (
          <AppText muted className="py-4 text-center">
            No countries match “{query}”.
          </AppText>
        ) : null}
      </ScrollView>
    </View>
  );
}
