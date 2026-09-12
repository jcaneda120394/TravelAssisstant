import { useQuery } from '@tanstack/react-query';

import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { providers } from '@/providers/registry';
import {
  convertAmountStatic,
  formatMoneyAmount,
} from '@/utils/display-money';

/**
 * Convert a source-currency amount into the user's display currency (live FX + fallback).
 */
export function useDisplayPrice(
  amount: number | null | undefined,
  sourceCurrency: string | null | undefined,
  options?: { suffix?: string },
) {
  const { currency: displayCurrency } = useDisplayCurrency();
  const from = (sourceCurrency ?? 'USD').toUpperCase();
  const to = displayCurrency.toUpperCase();
  const suffix = options?.suffix ?? '';

  const query = useQuery({
    queryKey: ['display-price', amount, from, to],
    enabled: amount != null && Number.isFinite(amount),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const value = amount as number;
      if (from === to) {
        return { amount: value, currency: to, live: false };
      }
      try {
        const conversion = await providers.currency.convert(value, from, to);
        return { amount: conversion.result, currency: to, live: true };
      } catch {
        return {
          amount: convertAmountStatic(value, from, to),
          currency: to,
          live: false,
        };
      }
    },
  });

  if (amount == null || !Number.isFinite(amount)) {
    return {
      label: null as string | null,
      displayCurrency: to,
      isLoading: false,
    };
  }

  const resolved = query.data ?? {
    amount: from === to ? amount : convertAmountStatic(amount, from, to),
    currency: to,
  };

  return {
    label: `${formatMoneyAmount(resolved.amount, resolved.currency)}${suffix}`,
    displayCurrency: to,
    isLoading: query.isLoading && from !== to,
  };
}
