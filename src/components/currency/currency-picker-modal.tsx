import { Modal, Pressable as RNPressable } from 'react-native';

import { CurrencyCountrySearch } from '@/components/forms/currency-country-search';
import { Button } from '@/components/ui/button';
import { AppText, SectionHeader } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { formatCurrencyWithSymbol, formatFxCurrencyName } from '@/constants/fx-currencies';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type Props = {
  visible: boolean;
  currency: string;
  onClose: () => void;
  onSelect: (currency: string) => void;
};

export function CurrencyPickerModal({ visible, currency, onClose, onSelect }: Props) {
  const scheme = useAppColorScheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Backdrop and sheet are siblings — nesting Pressables becomes <button> in <button> on web. */}
      <View className="flex-1 justify-end bg-black/45">
        <RNPressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss currency picker"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          className={`z-10 max-h-[85%] rounded-t-3xl px-5 pb-8 pt-4 ${
            scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-white'
          }`}
        >
          <View className="mb-3 items-center">
            <View className="h-1.5 w-12 rounded-full bg-brand-200 dark:bg-brand-700" />
          </View>
          <SectionHeader
            title="Display currency"
            subtitle="Search a country — prices for hotels, food, and attractions use that currency"
          />
          <CurrencyCountrySearch
            value={currency}
            autoFocus
            listClassName="mb-3 max-h-96"
            onChange={(code) => onSelect(code)}
          />
          <AppText muted className="mb-4 text-xs leading-5">
            Selected: {formatFxCurrencyName(currency)} ({formatCurrencyWithSymbol(currency)}).
            Estimates only — check current prices when booking.
          </AppText>
          <Button label="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
