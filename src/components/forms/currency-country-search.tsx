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
  /** Dense rows for compact dropdown pickers. */
  compact?: boolean;
  /** Max height class for the results list. */
  listClassName?: string;
};

/** Shared country/currency search list (no modal). */
export function CurrencyCountrySearch({
  value,
  onChange,
  excludeCode,
  autoFocus = false,
  compact = false,
  listClassName = 'max-h-72',
}: Props) {
  const scheme = useAppColorScheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const results = searchFxCurrencies(query, compact ? 24 : 40);
    if (!excludeCode) return results;
    return results.filter((item) => item.code !== excludeCode.toUpperCase());
  }, [query, excludeCode, compact]);

  return (
    <View>
      <TextField
        label={compact ? undefined : 'Country or currency'}
        value={query}
        onChangeText={setQuery}
        placeholder="Search Japan, PHP, USD…"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        compact={compact}
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
              className={`${compact ? 'mb-1 rounded-xl px-3 py-2' : 'mb-2 rounded-2xl px-4 py-3'} border ${
                active
                  ? 'border-brand-600 bg-brand-600'
                  : scheme === 'dark'
                    ? 'border-brand-800'
                    : 'border-brand-100'
              }`}
            >
              {compact ? (
                <View className="flex-row items-center justify-between gap-2">
                  <AppText
                    className={`flex-1 text-sm font-sans-semibold ${active ? 'text-white' : ''}`}
                    inverse={active}
                    numberOfLines={1}
                  >
                    {item.country}
                  </AppText>
                  <AppText
                    className={`text-xs font-sans-medium ${active ? 'text-brand-100' : ''}`}
                    muted={!active}
                    inverse={active}
                  >
                    {getCurrencySymbol(item.code)} {item.code}
                  </AppText>
                </View>
              ) : (
                <>
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
                </>
              )}
            </Pressable>
          );
        })}
        {filtered.length === 0 ? (
          <AppText muted className="py-4 text-center text-sm">
            No countries match “{query}”.
          </AppText>
        ) : null}
      </ScrollView>
    </View>
  );
}
