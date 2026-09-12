import { useMemo, useState } from 'react';
import { Modal } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { COUNTRIES } from '@/constants/preferences';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type Props = {
  label?: string;
  value: string;
  onChange: (code: string) => void;
  /** Extra ISO codes to include beyond the shared COUNTRIES list. */
  extraCodes?: Array<{ code: string; label: string }>;
};

export function CountrySelect({
  label = 'Country',
  value,
  onChange,
  extraCodes = [],
}: Props) {
  const scheme = useAppColorScheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of COUNTRIES) {
      map.set(item.code, item.label);
    }
    for (const item of extraCodes) {
      map.set(item.code, item.label);
    }
    return [...map.entries()]
      .map(([code, name]) => ({ code, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [extraCodes]);

  const selected = options.find((item) => item.code === value) ?? {
    code: value,
    label: value,
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.code.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <View className="mb-4">
      <AppText className="mb-2 font-sans-medium text-sm">{label}</AppText>
      <Pressable
        testID="country-select-trigger"
        onPress={() => setOpen(true)}
        className={`rounded-2xl border px-4 py-3 ${
          scheme === 'dark'
            ? 'border-brand-800 bg-surface-cardDark'
            : 'border-brand-100 bg-white'
        }`}
      >
        <AppText className="font-sans-semibold">
          {selected.label} ({selected.code})
        </AppText>
        <AppText muted className="mt-1 text-xs">
          Tap to choose another country
        </AppText>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className={`max-h-[80%] rounded-t-3xl px-5 pb-8 pt-4 ${
              scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-white'
            }`}
          >
            <AppText className="mb-3 text-lg font-sans-semibold">Select country</AppText>
            <TextField
              label="Search"
              value={query}
              onChangeText={setQuery}
              placeholder="Japan, PH, Thailand…"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ScrollView className="mb-3" keyboardShouldPersistTaps="handled">
              {filtered.map((item) => {
                const active = item.code === value;
                return (
                  <Pressable
                    key={item.code}
                    onPress={() => {
                      onChange(item.code);
                      setQuery('');
                      setOpen(false);
                    }}
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
                      {item.label}
                    </AppText>
                    <AppText
                      className={`text-xs ${active ? 'text-brand-100' : ''}`}
                      muted={!active}
                      inverse={active}
                    >
                      {item.code}
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
            <Button label="Close" variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
