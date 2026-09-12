/** Shared money formatting + offline FX fallback for display currency. */

import { getCurrencySymbol } from '@/constants/fx-currencies';

/** Rough mid-market USD cross rates for estimates when live FX is unavailable. */
const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150,
  PHP: 56,
  KRW: 1_350,
  CNY: 7.2,
  HKD: 7.8,
  TWD: 32,
  AUD: 1.52,
  CAD: 1.36,
  SGD: 1.34,
  THB: 35,
  VND: 25_000,
  IDR: 16_000,
  MYR: 4.7,
  INR: 83,
  NZD: 1.65,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.9,
  PLN: 4.0,
  CZK: 23,
  HUF: 360,
  TRY: 32,
  AED: 3.67,
  SAR: 3.75,
  ILS: 3.7,
  ZAR: 18.5,
  BRL: 5.0,
  MXN: 17,
  ARS: 900,
  CLP: 950,
  COP: 4_000,
  PEN: 3.7,
  EGP: 48,
  NGN: 1_550,
  KES: 130,
  RUB: 92,
  UAH: 40,
  PKR: 278,
  BDT: 110,
  LKR: 300,
  NPR: 133,
  KHR: 4_100,
  LAK: 21_000,
  MMK: 2_100,
  MOP: 8.0,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  JOD: 0.71,
  ISK: 138,
  RON: 4.6,
  BGN: 1.8,
  HRK: 7.0,
  RSD: 108,
};

export function formatMoneyAmount(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const symbol = getCurrencySymbol(code);
  if (!Number.isFinite(amount)) return `${symbol} —`;
  const zeroDecimal = code === 'JPY' || code === 'KRW' || code === 'VND' || code === 'IDR';
  const digits = zeroDecimal ? 0 : amount >= 100 ? 0 : 2;
  const rounded =
    digits === 0 ? Math.round(amount) : Math.round(amount * 100) / 100;
  const number = rounded.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
  // Prefer symbol-first (₱1,200); fall back to code when symbol is the ISO code itself.
  if (symbol === code) {
    return `${code} ${number}`;
  }
  return `${symbol}${number}`;
}

/** Convert using static USD cross rates when live FX is unavailable. */
export function convertAmountStatic(
  amount: number,
  from: string,
  to: string,
): number {
  const base = from.toUpperCase();
  const quote = to.toUpperCase();
  if (base === quote) return amount;
  const fromRate = USD_RATES[base] ?? 1;
  const toRate = USD_RATES[quote] ?? 1;
  return (amount / fromRate) * toRate;
}

export function usdToCurrency(usd: number, currency: string): number {
  const rate = USD_RATES[currency.toUpperCase()] ?? 1;
  return usd * rate;
}
