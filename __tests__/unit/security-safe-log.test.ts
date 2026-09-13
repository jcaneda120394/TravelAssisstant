import { safeLog } from '@/lib/logging/safe-log';

describe('safeLog', () => {
  it('redacts sensitive keys and token-like strings', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    safeLog.error('login failed', {
      password: 'supersecret',
      nested: { refresh_token: 'abc123token' },
      note: 'ok',
    });
    expect(errorSpy).toHaveBeenCalled();
    const meta = errorSpy.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(meta.password).toBe('[redacted]');
    expect((meta.nested as Record<string, unknown>).refresh_token).toBe('[redacted]');
    expect(meta.note).toBe('ok');
    errorSpy.mockRestore();
  });
});
