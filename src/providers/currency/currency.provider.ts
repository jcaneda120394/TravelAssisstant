import type { CurrencyConversion } from '@/types/domain';

export interface CurrencyProvider {
  readonly name: string;
  convert(amount: number, from: string, to: string): Promise<CurrencyConversion>;
  getRate(from: string, to: string): Promise<number>;
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
      result: Number((amount * rate).toFixed(4)),
      rate,
      updatedAt: new Date().toISOString(),
      isMock: true,
    };
  }
}
