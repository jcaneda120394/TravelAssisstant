import { fetchJson } from '@/lib/http/fetch-json';
import type {
  CurrencyProvider,
  FxHistoryRange,
  FxHistorySeries,
} from '@/providers/currency/currency.provider';
import type { CurrencyConversion } from '@/types/domain';

type FrankfurterLatest = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

type FrankfurterSeries = {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
};

type ExchangeRateApiLatest = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function rangeStart(range: FxHistoryRange): string {
  switch (range) {
    case '5D':
      return isoDaysAgo(7);
    case '1M':
      return isoDaysAgo(31);
    case '1Y':
      return isoDaysAgo(365);
    case '5Y':
      return isoDaysAgo(365 * 5);
    default:
      return isoDaysAgo(31);
  }
}

/**
 * Live FX:
 * 1) Frankfurter (ECB) — latest + history
 * 2) ExchangeRate-API v4 fallback — latest only (no key)
 */
export class FrankfurterCurrencyProvider implements CurrencyProvider {
  readonly name = 'frankfurter';

  private async frankfurterLatest(
    amount: number,
    from: string,
    to: string,
  ): Promise<FrankfurterLatest> {
    return fetchJson<FrankfurterLatest>(
      `https://api.frankfurter.dev/v1/latest?amount=${encodeURIComponent(String(amount))}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { cacheTtlMs: 5 * 60_000, timeoutMs: 12_000 },
    );
  }

  private async exchangeRateApiLatest(from: string): Promise<ExchangeRateApiLatest> {
    return fetchJson<ExchangeRateApiLatest>(
      `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(from)}`,
      { cacheTtlMs: 5 * 60_000, timeoutMs: 12_000 },
    );
  }

  async getRate(from: string, to: string): Promise<number> {
    const base = from.toUpperCase();
    const quote = to.toUpperCase();
    if (base === quote) return 1;

    try {
      const data = await this.frankfurterLatest(1, base, quote);
      const rate = data.rates[quote];
      if (rate == null) throw new Error('missing rate');
      return rate;
    } catch {
      const data = await this.exchangeRateApiLatest(base);
      const rate = data.rates[quote];
      if (rate == null) {
        throw new Error(`FX rate unavailable for ${base} → ${quote}`);
      }
      return rate;
    }
  }

  async convert(amount: number, from: string, to: string): Promise<CurrencyConversion> {
    const base = from.toUpperCase();
    const quote = to.toUpperCase();
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    if (base === quote) {
      return {
        from: base,
        to: quote,
        amount: safeAmount,
        result: safeAmount,
        rate: 1,
        updatedAt: new Date().toISOString(),
        isMock: false,
      };
    }

    try {
      const data = await this.frankfurterLatest(safeAmount || 1, base, quote);
      const quoted = data.rates[quote];
      if (quoted == null) throw new Error('missing rate');
      const rate = safeAmount === 0 ? quoted : quoted / (safeAmount || 1);
      const result = safeAmount === 0 ? 0 : quoted;
      return {
        from: base,
        to: quote,
        amount: safeAmount,
        result: Number(result.toPrecision(8)),
        rate: Number(rate.toPrecision(8)),
        updatedAt: `${data.date}T12:00:00.000Z`,
        isMock: false,
      };
    } catch {
      const data = await this.exchangeRateApiLatest(base);
      const rate = data.rates[quote];
      if (rate == null) {
        throw new Error(`FX conversion unavailable for ${base} → ${quote}`);
      }
      return {
        from: base,
        to: quote,
        amount: safeAmount,
        result: Number((safeAmount * rate).toPrecision(8)),
        rate: Number(rate.toPrecision(8)),
        updatedAt: `${data.date}T12:00:00.000Z`,
        isMock: false,
      };
    }
  }

  async getHistory(from: string, to: string, range: FxHistoryRange): Promise<FxHistorySeries> {
    const base = from.toUpperCase();
    const quote = to.toUpperCase();
    const start = rangeStart(range);
    const end = isoDaysAgo(0);

    if (base === quote) {
      return {
        from: base,
        to: quote,
        range,
        points: [{ date: end, rate: 1 }],
        source: 'Frankfurter · ECB',
      };
    }

    try {
      const data = await fetchJson<FrankfurterSeries>(
        `https://api.frankfurter.dev/v1/${start}..${end}?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`,
        { cacheTtlMs: 30 * 60_000, timeoutMs: 15_000 },
      );

      const points = Object.entries(data.rates)
        .map(([date, rates]) => ({
          date,
          rate: rates[quote] ?? Number.NaN,
        }))
        .filter((p) => Number.isFinite(p.rate))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        from: base,
        to: quote,
        range,
        points,
        source: 'Frankfurter · ECB',
      };
    } catch {
      // Fallback: synthesize a short series from the latest live rate.
      const rate = await this.getRate(base, quote);
      const days = range === '5D' ? 5 : range === '1M' ? 30 : 60;
      const points = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - (days - 1 - i));
        return { date: d.toISOString().slice(0, 10), rate };
      });
      return {
        from: base,
        to: quote,
        range,
        points,
        source: 'Live rate · history unavailable',
      };
    }
  }
}
