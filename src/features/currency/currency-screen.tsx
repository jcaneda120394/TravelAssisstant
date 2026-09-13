import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CurrencySearchField } from '@/components/forms/currency-search-field';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { formatFxCurrencyLabel } from '@/constants/fx-currencies';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import type { FxHistoryRange } from '@/providers/currency/currency.provider';
import { providers } from '@/providers/registry';

const CACHE_KEY = 'travelassistant.fx.last';
const RANGES: FxHistoryRange[] = ['5D', '1M', '1Y', '5Y'];

function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 100) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatMoney(value: number, code: string): string {
  if (!Number.isFinite(value)) return '—';
  const digits = code === 'JPY' || code === 'KRW' || code === 'VND' ? 0 : value >= 100 ? 2 : value >= 1 ? 2 : 4;
  return `${formatRate(Number(value.toFixed(digits)))}`;
}

function RateSparkline({
  points,
}: {
  points: Array<{ date: string; rate: number }>;
}) {
  const scheme = useAppColorScheme();
  const sample =
    points.length > 48
      ? points.filter((_, i) => i % Math.ceil(points.length / 48) === 0 || i === points.length - 1)
      : points;

  const rates = sample.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = max - min || 1;

  if (sample.length < 2) {
    return (
      <AppText muted className="py-8 text-center">
        Not enough history for this range.
      </AppText>
    );
  }

  return (
    <View>
      <View className="h-36 flex-row items-end gap-0.5">
        {sample.map((point) => {
          const heightPct = 12 + ((point.rate - min) / span) * 88;
          return (
            <View key={point.date} className="flex-1 items-center justify-end" style={{ height: '100%' }}>
              <View
                className={`w-full rounded-t-sm ${
                  scheme === 'dark' ? 'bg-sky-400' : 'bg-brand-500'
                }`}
                style={{ height: `${heightPct}%`, minHeight: 2, opacity: 0.85 }}
              />
            </View>
          );
        })}
      </View>
      <View className="mt-2 flex-row justify-between">
        <AppText muted className="text-xs">
          {sample[0]?.date}
        </AppText>
        <AppText muted className="text-xs">
          {formatRate(min)} – {formatRate(max)}
        </AppText>
        <AppText muted className="text-xs">
          {sample[sample.length - 1]?.date}
        </AppText>
      </View>
    </View>
  );
}

export function CurrencyScreen() {
  const { currency: home } = useDisplayCurrency();
  const scheme = useAppColorScheme();

  const [amountFrom, setAmountFrom] = useState('1');
  const [amountTo, setAmountTo] = useState('');
  const [from, setFrom] = useState<string>(home);
  const [to, setTo] = useState<string>(home === 'USD' ? 'JPY' : 'USD');
  const [editing, setEditing] = useState<'from' | 'to'>('from');
  const [range, setRange] = useState<FxHistoryRange>('1M');

  useEffect(() => {
    setFrom(home);
  }, [home]);

  const amountValue = useMemo(() => {
    const raw = editing === 'from' ? amountFrom : amountTo;
    const n = Number(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }, [amountFrom, amountTo, editing]);

  const convertQuery = useQuery({
    queryKey: ['fx-convert', editing === 'from' ? from : to, editing === 'from' ? to : from, amountValue],
    queryFn: async () => {
      const source = editing === 'from' ? from : to;
      const target = editing === 'from' ? to : from;
      const conversion = await providers.currency.convert(amountValue, source, target);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(conversion));
      analytics.track('currency_converted', { from: source, to: target });
      return conversion;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnReconnect: true,
  });

  const unitQuery = useQuery({
    queryKey: ['fx-unit', from, to],
    queryFn: () => providers.currency.convert(1, from, to),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ['fx-history', from, to, range],
    queryFn: () => providers.currency.getHistory(from, to, range),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    const conversion = convertQuery.data;
    if (!conversion) return;
    if (editing === 'from') {
      setAmountTo(formatMoney(conversion.result, to));
    } else {
      setAmountFrom(formatMoney(conversion.result, from));
    }
  }, [convertQuery.data, editing, from, to]);

  const swap = () => {
    setFrom(to);
    setTo(from);
    setAmountFrom(amountTo || '1');
    setAmountTo(amountFrom);
    setEditing('from');
  };

  const unitRate = unitQuery.data?.rate ?? convertQuery.data?.rate;
  const updatedAt = unitQuery.data?.updatedAt ?? convertQuery.data?.updatedAt;
  const sourceLabel = unitQuery.data?.isMock
    ? 'Mock rates'
    : historyQuery.data?.source ?? 'Frankfurter · ECB';

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-10" testID="screen-currency">
        <SectionHeader
          eyebrow="Live FX"
          title="Currency converter"
          subtitle="Search by country for From and To, then enter an amount"
        />

        <Card className="mb-4">
          <AppText muted className="text-sm">
            1 {formatFxCurrencyLabel(from)} equals
          </AppText>
          {unitQuery.isLoading && !unitQuery.data ? (
            <Skeleton height={40} className="mt-2" />
          ) : (
            <AppText className="mt-1 font-display text-3xl leading-10">
              {formatRate(unitRate ?? 0)} {formatFxCurrencyLabel(to)}
            </AppText>
          )}
          <AppText muted className="mt-2 text-xs">
            {updatedAt
              ? `${new Date(updatedAt).toLocaleString()} · ${sourceLabel}`
              : convertQuery.isError
                ? getErrorMessage(convertQuery.error)
                : 'Fetching live rate…'}
            {unitQuery.isFetching ? ' · updating…' : ''}
          </AppText>
        </Card>

        <Card className="mb-4">
          <CurrencySearchField
            label="From"
            value={from}
            excludeCode={to}
            onChange={setFrom}
            testID="fx-from-search"
          />
          <TextField
            label="Amount"
            value={amountFrom}
            onChangeText={(text) => {
              setEditing('from');
              setAmountFrom(text);
            }}
            keyboardType="decimal-pad"
            testID="fx-amount-from"
          />

          <View className="mb-2">
            <Button label="Swap currencies" variant="ghost" onPress={swap} />
          </View>

          <CurrencySearchField
            label="To"
            value={to}
            excludeCode={from}
            onChange={setTo}
            testID="fx-to-search"
          />
          <TextField
            label="Converted amount"
            value={amountTo}
            onChangeText={(text) => {
              setEditing('to');
              setAmountTo(text);
            }}
            keyboardType="decimal-pad"
            testID="fx-amount-to"
          />

          {convertQuery.isError ? (
            <AppText className="mt-3 text-sm text-red-500">
              {getErrorMessage(convertQuery.error)}
            </AppText>
          ) : null}
        </Card>

        <Card className="mb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <AppText className="font-sans-semibold">
              {from}/{to} trend
            </AppText>
            <Button
              label="Refresh"
              variant="ghost"
              loading={unitQuery.isFetching || historyQuery.isFetching}
              onPress={() => {
                void unitQuery.refetch();
                void convertQuery.refetch();
                void historyQuery.refetch();
              }}
            />
          </View>

          <View className="mb-3 flex-row flex-wrap gap-2">
            {RANGES.map((item) => {
              const selected = range === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setRange(item)}
                  className={`rounded-full px-3 py-1.5 border ${
                    selected
                      ? 'border-brand-600 bg-brand-600'
                      : scheme === 'dark'
                        ? 'border-brand-800 bg-surface-cardDark'
                        : 'border-black/8 bg-white'
                  }`}
                >
                  <AppText inverse={selected} className="text-xs font-sans-semibold">
                    {item}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {historyQuery.isLoading && !historyQuery.data ? (
            <Skeleton height={140} />
          ) : historyQuery.isError ? (
            <AppText muted>{getErrorMessage(historyQuery.error)}</AppText>
          ) : (
            <RateSparkline points={historyQuery.data?.points ?? []} />
          )}
        </Card>

        <AppText muted className="text-xs leading-5">
          Mid-market estimates from {sourceLabel}. Bank / card rates include fees and may differ.
          Confirm before sending money or booking.
        </AppText>
      </ScrollView>
    </Screen>
  );
}
