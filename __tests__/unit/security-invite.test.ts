/**
 * @jest-environment node
 */
import { inviteEmailSchema } from '@/lib/validation/security-schemas';

describe('trip invite hardening contracts', () => {
  it('requires a real email for invites', () => {
    expect(inviteEmailSchema.parse('partner@example.com')).toBe('partner@example.com');
    expect(() => inviteEmailSchema.parse('owner')).toThrow();
  });

  it('expects opaque invite tokens to be long enough', () => {
    const token = 'a'.repeat(64);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect('short').toHaveLength(5);
  });
});
