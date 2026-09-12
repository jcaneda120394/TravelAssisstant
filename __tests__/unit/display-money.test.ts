import { convertAmountStatic, formatMoneyAmount } from '@/utils/display-money';

describe('display-money', () => {
  it('formats JPY with yen symbol and without decimals', () => {
    const label = formatMoneyAmount(1234.5, 'JPY');
    expect(label.startsWith('¥')).toBe(true);
    expect(label).toContain('1');
    expect(label).not.toMatch(/\.\d/);
  });

  it('formats PHP with peso symbol', () => {
    expect(formatMoneyAmount(560, 'PHP')).toMatch(/^₱/);
  });

  it('converts USD to PHP with static rates', () => {
    const php = convertAmountStatic(10, 'USD', 'PHP');
    expect(php).toBe(560);
  });

  it('returns same amount when currencies match', () => {
    expect(convertAmountStatic(42, 'EUR', 'EUR')).toBe(42);
  });
});
