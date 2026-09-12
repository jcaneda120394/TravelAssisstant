import type { CurrencyConversion } from '@/types/domain';

export type FxHistoryRange = '5D' | '1M' | '1Y' | '5Y';

export type FxHistoryPoint = {
  date: string;
  rate: number;
};

export type FxHistorySeries = {
  from: string;
  to: string;
  range: FxHistoryRange;
  points: FxHistoryPoint[];
  source: string;
};

export interface CurrencyProvider {
  readonly name: string;
  convert(amount: number, from: string, to: string): Promise<CurrencyConversion>;
  getRate(from: string, to: string): Promise<number>;
  getHistory(from: string, to: string, range: FxHistoryRange): Promise<FxHistorySeries>;
}

export class MockCurrencyProvider implements CurrencyProvider {
  readonly name = 'mock-currency';

  private readonly rates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.78,
    JPY: 149.5,
    PHP: 58.2,
    KRW: 1380,
    CNY: 7.2,
    AUD: 1.52,
    CAD: 1.36,
    SGD: 1.34,
    THB: 35,
    INR: 83,
  };

  async getRate(from: string, to: string): Promise<number> {
    const fromRate = this.rates[from.toUpperCase()];
    const toRate = this.rates[to.toUpperCase()];
    if (fromRate == null || toRate == null) {
      throw new Error(`Mock FX rate unavailable for ${from} → ${to}`);
    }
    return toRate / fromRate;
  }

  async convert(amount: number, from: string, to: string): Promise<CurrencyConversion> {
    const rate = await this.getRate(from, to);
    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount,
      result: Number((amount * rate).toFixed(6)),
      rate,
      updatedAt: new Date().toISOString(),
      isMock: true,
    };
  }

  async getHistory(from: string, to: string, range: FxHistoryRange): Promise<FxHistorySeries> {
    const base = await this.getRate(from, to);
    const days = range === '5D' ? 5 : range === '1M' ? 30 : range === '1Y' ? 90 : 120;
    const points: FxHistoryPoint[] = [];
    const now = Date.now();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000);
      const wobble = 1 + Math.sin(i / 4) * 0.012;
      points.push({
        date: d.toISOString().slice(0, 10),
        rate: Number((base * wobble).toFixed(6)),
      });
    }
    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      range,
      points,
      source: 'Mock FX',
    };
  }
}
