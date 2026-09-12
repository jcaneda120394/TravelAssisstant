import { fetchJson } from '@/lib/http/fetch-json';
import type { CurrencyProvider } from '@/providers/currency/currency.provider';
import type { CurrencyConversion } from '@/types/domain';

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

export class FrankfurterCurrencyProvider implements CurrencyProvider {
  readonly name = 'frankfurter';

  async getRate(from: string, to: string): Promise<number> {
    const base = from.toUpperCase();
    const quote = to.toUpperCase();
    if (base === quote) {
      return 1;
    }
    const data = await fetchJson<FrankfurterResponse>(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`,
      { cacheTtlMs: 60 * 60_000, timeoutMs: 10_000 },
    );
    const rate = data.rates[quote];
    if (rate == null) {
      throw new Error(`FX rate unavailable for ${base} → ${quote}`);
    }
    return rate;
  }

  async convert(amount: number, from: string, to: string): Promise<CurrencyConversion> {
    const rate = await this.getRate(from, to);
    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount,
      result: Number((amount * rate).toFixed(4)),
      rate,
      updatedAt: new Date().toISOString(),
      isMock: false,
    };
  }
}
