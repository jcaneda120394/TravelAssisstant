import { useState } from 'react';
import { Modal } from 'react-native';

import { CurrencyCountrySearch } from '@/components/forms/currency-country-search';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import {
  findFxCurrency,
  formatFxCurrencyLabel,
} from '@/constants/fx-currencies';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type Props = {
  label: string;
  value: string;
  onChange: (code: string) => void;
  excludeCode?: string;
  testID?: string;
};

export function CurrencySearchField({
  label,
  value,
  onChange,
  excludeCode,
  testID,
}: Props) {
  const scheme = useAppColorScheme();
  const [open, setOpen] = useState(false);

  const selected = findFxCurrency(value);
  const display = selected
    ? `${selected.country} · ${selected.code}`
    : formatFxCurrencyLabel(value);

  return (
    <View className="mb-3">
      <AppText className="mb-2 font-sans-medium text-sm">{label}</AppText>
      <Pressable
        testID={testID}
        onPress={() => setOpen(true)}
        className={`rounded-2xl border px-4 py-3 ${
          scheme === 'dark'
            ? 'border-brand-800 bg-surface-cardDark'
            : 'border-brand-100 bg-white'
        }`}
      >
        <AppText className="font-sans-semibold">{display}</AppText>
        <AppText muted className="mt-1 text-xs">
          {selected?.currencyName ?? 'Tap to search country or currency'}
        </AppText>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className={`max-h-[82%] rounded-t-3xl px-5 pb-8 pt-4 ${
              scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-white'
            }`}
          >
            <AppText className="mb-1 text-lg font-sans-semibold">Search country</AppText>
            <AppText muted className="mb-3 text-sm">
              Type a country or currency — e.g. Japan, PHP, Euro
            </AppText>
            <CurrencyCountrySearch
              value={value}
              excludeCode={excludeCode}
              autoFocus
              listClassName="mb-3 max-h-80"
              onChange={(code) => {
                onChange(code);
                setOpen(false);
              }}
            />
            <Button label="Close" variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
