import { Alert } from 'react-native';

import { requireAuthToSave } from '@/features/auth/require-auth';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

describe('requireAuthToSave', () => {
  const push = jest.fn();
  const router = { push };
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('allows signed-in users without prompting', () => {
    (useAuthStore.getState as jest.Mock).mockReturnValue({ user: { id: 'u1' } });
    expect(requireAuthToSave(router, { actionLabel: 'save trips' })).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('blocks guests and offers sign up', () => {
    (useAuthStore.getState as jest.Mock).mockReturnValue({ user: null });
    expect(requireAuthToSave(router, { actionLabel: 'save favorites' })).toBe(false);
    expect(alertSpy).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const signup = buttons.find((b) => b.text === 'Sign up');
    signup?.onPress?.();
    expect(push).toHaveBeenCalledWith('/(auth)/signup');
  });
});
