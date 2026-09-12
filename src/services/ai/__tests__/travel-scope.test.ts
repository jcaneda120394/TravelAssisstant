import { evaluateTravelScope } from '@/services/ai/travel-scope';

describe('evaluateTravelScope', () => {
  it('accepts travel place and food questions', () => {
    expect(evaluateTravelScope('Best restaurants nearby').ok).toBe(true);
    expect(evaluateTravelScope('What should we do this afternoon in Tokyo?').ok).toBe(true);
    expect(evaluateTravelScope('Find hotels in my budget').ok).toBe(true);
    expect(evaluateTravelScope('How do I get to the airport by train?').ok).toBe(true);
  });

  it('rejects off-topic questions', () => {
    const math = evaluateTravelScope('Solve this calculus homework for me');
    expect(math.ok).toBe(false);
    const crypto = evaluateTravelScope('Should I buy bitcoin today?');
    expect(crypto.ok).toBe(false);
    const empty = evaluateTravelScope('  ');
    expect(empty.ok).toBe(false);
  });
});
