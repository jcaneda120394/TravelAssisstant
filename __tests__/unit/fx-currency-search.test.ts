import { searchFxCurrencies } from '@/constants/fx-currencies';

describe('searchFxCurrencies', () => {
  it('finds Japan by country name', () => {
    const results = searchFxCurrencies('japan');
    expect(results[0]?.code).toBe('JPY');
  });

  it('finds Philippines by peso alias', () => {
    const results = searchFxCurrencies('peso');
    expect(results.some((item) => item.code === 'PHP')).toBe(true);
  });

  it('finds by currency code', () => {
    const results = searchFxCurrencies('usd');
    expect(results[0]?.code).toBe('USD');
  });
});
