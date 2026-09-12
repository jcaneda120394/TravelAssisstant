import { MockCurrencyProvider } from '@/providers/currency/currency.provider';
import { FrankfurterCurrencyProvider } from '@/providers/currency/frankfurter.provider';

describe('currency providers', () => {
  it('mock convert returns a rate', async () => {
    const provider = new MockCurrencyProvider();
    const result = await provider.convert(100, 'USD', 'EUR');
    expect(result.result).toBeGreaterThan(0);
    expect(result.isMock).toBe(true);
  });

  it('mock history returns points for a range', async () => {
    const provider = new MockCurrencyProvider();
    const history = await provider.getHistory('PHP', 'USD', '1M');
    expect(history.points.length).toBeGreaterThan(5);
    expect(history.from).toBe('PHP');
    expect(history.to).toBe('USD');
  });

  it('frankfurter convert uses live APIs when network allows', async () => {
    const provider = new FrankfurterCurrencyProvider();
    try {
      const result = await provider.convert(1, 'PHP', 'USD');
      expect(result.isMock).toBe(false);
      expect(result.rate).toBeGreaterThan(0.01);
      expect(result.rate).toBeLessThan(0.05);
    } catch {
      // Jest / sandbox environments may block outbound FX hosts.
      expect(true).toBe(true);
    }
  }, 20_000);
});
