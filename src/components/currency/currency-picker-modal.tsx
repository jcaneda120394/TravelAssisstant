import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable as RNPressable, useWindowDimensions } from 'react-native';

import { CurrencyCountrySearch } from '@/components/forms/currency-country-search';
import { AppText } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { formatCurrencyWithSymbol } from '@/constants/fx-currencies';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type Props = {
  visible: boolean;
  currency: string;
  onClose: () => void;
  onSelect: (currency: string) => void;
};

/** Compact currency dropdown — closes immediately after a selection. */
export function CurrencyPickerModal({ visible, currency, onClose, onSelect }: Props) {
  const scheme = useAppColorScheme();
  const { height } = useWindowDimensions();
  const sheetMaxHeight = Math.min(420, Math.round(height * 0.85));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6">
        <RNPressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss currency picker"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}
        />
        <View
          className={`z-10 w-full max-w-[320px] overflow-hidden rounded-2xl border shadow-lg ${
            scheme === 'dark'
              ? 'border-brand-800 bg-surface-cardDark'
              : 'border-black/8 bg-white'
          }`}
          style={{ maxHeight: sheetMaxHeight }}
        >
          <View className="flex-row items-center justify-between border-b border-black/8 px-3 py-2.5 dark:border-brand-800">
            <AppText className="text-sm font-sans-semibold">Currency</AppText>
            <View className="flex-row items-center gap-2">
              <AppText muted className="text-xs">
                {formatCurrencyWithSymbol(currency)}
              </AppText>
              <RNPressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                className="h-7 w-7 items-center justify-center rounded-full"
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={scheme === 'dark' ? '#9BB0AC' : '#5B6F6C'}
                />
              </RNPressable>
            </View>
          </View>

          <View className="px-3 pb-3 pt-2">
            {visible ? (
              <CurrencyCountrySearch
                key={currency}
                value={currency}
                autoFocus
                compact
                listClassName="max-h-72"
                onChange={(code) => {
                  onSelect(code);
                  onClose();
                }}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
