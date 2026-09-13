import {
  inviteEmailSchema,
  tripTitleSchema,
  budgetAmountSchema,
  aiMessageSchema,
} from '@/lib/validation/security-schemas';

describe('security input schemas', () => {
  it('accepts valid trip titles and rejects oversized', () => {
    expect(tripTitleSchema.parse('Tokyo week')).toBe('Tokyo week');
    expect(() => tripTitleSchema.parse('x'.repeat(200))).toThrow();
  });

  it('validates invite emails', () => {
    expect(inviteEmailSchema.parse('a@b.co')).toBe('a@b.co');
    expect(() => inviteEmailSchema.parse('not-an-email')).toThrow();
  });

  it('bounds budget amounts', () => {
    expect(budgetAmountSchema.parse(12.5)).toBe(12.5);
    expect(() => budgetAmountSchema.parse(-1)).toThrow();
    expect(() => budgetAmountSchema.parse(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('bounds AI messages', () => {
    expect(aiMessageSchema.parse('Plan a day in Kyoto')).toBeTruthy();
    expect(() => aiMessageSchema.parse('')).toThrow();
    expect(() => aiMessageSchema.parse('x'.repeat(9000))).toThrow();
  });
});
