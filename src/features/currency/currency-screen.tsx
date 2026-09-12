import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TextField } from '@/components/forms/text-field';
import { ChipSelect } from '@/components/forms/chip-select';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView } from '@/components/ui/primitives';
import { CURRENCIES } from '@/constants/preferences';
import { providers } from '@/providers/registry';
import { analytics } from '@/lib/analytics';
import type { CurrencyConversion } from '@/types/domain';

const CACHE_KEY = 'travelassistant.fx.last';

export function CurrencyScreen() {
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState<(typeof CURRENCIES)[number]>('PHP');
  const [to, setTo] = useState<(typeof CURRENCIES)[number]>('JPY');
  const [result, setResult] = useState<CurrencyConversion | null>(null);

  const convert = useMutation({
    mutationFn: async () => {
      const conversion = await providers.currency.convert(Number(amount) || 0, from, to);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(conversion));
      analytics.track('currency_converted', { from, to });
      return conversion;
    },
    onSuccess: setResult,
  });

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-currency">
        <SectionHeader title="Currency" subtitle="Offline-cached last rate after conversion" />
        <Card className="mb-4">
          <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <AppText className="mb-2 font-sans-medium">From</AppText>
          <ChipSelect options={CURRENCIES} values={[from]} multiple={false} onChange={(v) => setFrom(v[0] ?? 'USD')} />
          <AppText className="mb-2 mt-4 font-sans-medium">To</AppText>
          <ChipSelect options={CURRENCIES} values={[to]} multiple={false} onChange={(v) => setTo(v[0] ?? 'USD')} />
          <Button label="Swap" variant="ghost" onPress={swap} />
          <Button label="Convert" loading={convert.isPending} onPress={() => convert.mutate()} />
        </Card>
        {result ? (
          <Card>
            <AppText className="font-sans-bold text-2xl">
              {result.result} {result.to}
            </AppText>
            <AppText muted className="mt-2">
              Rate {result.rate} · Updated {new Date(result.updatedAt).toLocaleString()}
              {result.isMock ? ' · mock rate' : ''}
            </AppText>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
