import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { AppError, toAppError } from '@/lib/errors/app-error';
import { assertSupabase, supabase } from '@/lib/supabase/client';
import type { AuthUser } from '@/types/auth';
import { analytics } from '@/lib/analytics';
import {
  createLocalSession,
  clearLocalSession,
  getLocalSession,
  type LocalAuthSession,
} from '@/services/auth/local-auth';

WebBrowser.maybeCompleteAuthSession();

function mapUser(id: string, email: string | null, fullName: string | null): AuthUser {
  return { id, email, fullName };
}

export async function getCurrentSessionUser(): Promise<AuthUser | null> {
  if (!env.isSupabaseConfigured) {
    const local = await getLocalSession();
    return local
      ? mapUser(local.user.id, local.user.email, local.user.fullName)
      : null;
  }

  const client = assertSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw toAppError(error, 'Failed to read session');
  }
  const user = data.session?.user;
  if (!user) {
    return null;
  }
  return mapUser(
    user.id,
    user.email ?? null,
    (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
  );
}

export async function signUpWithEmail(params: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ user: AuthUser; sessionCreated: boolean }> {
  if (!env.isSupabaseConfigured) {
    if (env.isProduction) {
      throw new AppError('Authentication is unavailable. Contact support.', {
        code: 'AUTH_NOT_CONFIGURED',
      });
    }
    const session = await createLocalSession({
      email: params.email,
      fullName: params.fullName,
    });
    analytics.track('auth_signup', { method: 'demo_email' });
    return {
      user: mapUser(session.user.id, session.user.email, session.user.fullName),
      sessionCreated: true,
    };
  }

  const client = assertSupabase();
  const { data, error } = await client.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { full_name: params.fullName },
    },
  });

  if (error) {
    throw toAppError(error, 'Sign up failed');
  }
  if (!data.user) {
    throw new AppError('Sign up succeeded but no user was returned', {
      code: 'AUTH_NO_USER',
    });
  }

  // Supabase may return a user object even when the email already exists
  // (to avoid account enumeration). Identities empty usually means duplicate.
  if ((data.user.identities?.length ?? 0) === 0) {
    throw new AppError('An account with this email already exists. Please sign in.', {
      code: 'AUTH_EMAIL_EXISTS',
    });
  }

  analytics.track('auth_signup', { method: 'email' });
  return {
    user: mapUser(data.user.id, data.user.email ?? null, params.fullName),
    sessionCreated: Boolean(data.session),
  };
}

export async function signInWithEmail(params: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  if (!env.isSupabaseConfigured) {
    if (env.isProduction) {
      throw new AppError('Authentication is unavailable. Contact support.', {
        code: 'AUTH_NOT_CONFIGURED',
      });
    }
    const session = await createLocalSession({
      email: params.email,
      fullName: params.email.split('@')[0] ?? 'Traveler',
    });
    analytics.track('auth_login', { method: 'demo_email' });
    return mapUser(session.user.id, session.user.email, session.user.fullName);
  }

  const client = assertSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw toAppError(error, 'Sign in failed');
  }
  if (!data.user) {
    throw new AppError('Sign in succeeded but no user was returned', {
      code: 'AUTH_NO_USER',
    });
  }

  analytics.track('auth_login', { method: 'email' });
  return mapUser(
    data.user.id,
    data.user.email ?? null,
    (data.user.user_metadata?.full_name as string | undefined) ?? null,
  );
}

export async function sendMagicLink(email: string): Promise<void> {
  if (!env.isSupabaseConfigured) {
    throw new AppError(
      'Magic link requires Supabase. Configure EXPO_PUBLIC_SUPABASE_URL and ANON_KEY, or use email/password demo auth.',
      { code: 'AUTH_SUPABASE_REQUIRED' },
    );
  }

  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'travelassistant' });
  const client = assertSupabase();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw toAppError(error, 'Failed to send magic link');
  }

  analytics.track('auth_magic_link_sent');
}

export async function signInWithGoogle(): Promise<AuthUser | null> {
  if (!env.isSupabaseConfigured) {
    throw new AppError(
      'Google Sign-In requires Supabase OAuth configuration.',
      { code: 'AUTH_SUPABASE_REQUIRED' },
    );
  }

  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'travelassistant' });
  const client = assertSupabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw toAppError(error, 'Google sign-in failed');
  }
  if (!data.url) {
    throw new AppError('No OAuth URL returned', { code: 'AUTH_OAUTH_URL' });
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    return null;
  }

  const { params, errorCode } = QueryParams.getQueryParams(result.url);
  if (errorCode) {
    throw new AppError(String(errorCode), { code: 'AUTH_OAUTH_CALLBACK' });
  }

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) {
    throw new AppError('Missing tokens in OAuth callback', {
      code: 'AUTH_OAUTH_TOKENS',
    });
  }

  const { data: sessionData, error: sessionError } = await client.auth.setSession({
    access_token,
    refresh_token,
  });

  if (sessionError) {
    throw toAppError(sessionError, 'Failed to establish Google session');
  }

  const user = sessionData.user;
  if (!user) {
    return null;
  }

  analytics.track('auth_login', { method: 'google' });
  return mapUser(
    user.id,
    user.email ?? null,
    (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
  );
}

export async function signInWithApple(): Promise<AuthUser | null> {
  if (Platform.OS !== 'ios') {
    throw new AppError('Apple Sign-In is only available on iOS.', {
      code: 'AUTH_APPLE_PLATFORM',
    });
  }

  if (!env.isSupabaseConfigured) {
    throw new AppError(
      'Apple Sign-In requires Supabase OAuth configuration.',
      { code: 'AUTH_SUPABASE_REQUIRED' },
    );
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new AppError('Apple Sign-In did not return an identity token.', {
      code: 'AUTH_APPLE_TOKEN',
    });
  }

  const client = assertSupabase();
  const { data, error } = await client.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) {
    throw toAppError(error, 'Apple sign-in failed');
  }

  const user = data.user;
  if (!user) {
    return null;
  }

  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');

  analytics.track('auth_login', { method: 'apple' });
  return mapUser(user.id, user.email ?? null, fullName || null);
}

export async function signOut(): Promise<void> {
  const { clearPrivateOfflineData } = await import('@/services/offline/offline.service');
  await clearPrivateOfflineData().catch(() => undefined);

  if (!env.isSupabaseConfigured) {
    await clearLocalSession();
    analytics.track('auth_logout', { method: 'demo' });
    return;
  }

  const client = assertSupabase();
  const { error } = await client.auth.signOut();
  if (error) {
    throw toAppError(error, 'Sign out failed');
  }
  analytics.track('auth_logout', { method: 'supabase' });
}

/**
 * Permanently deletes the signed-in user's Auth account (cascades owned rows via FKs).
 * Requires Supabase Edge Function `delete-account`.
 */
export async function deleteAccount(): Promise<void> {
  if (!env.isSupabaseConfigured) {
    await clearLocalSession();
    const { clearPrivateOfflineData } = await import('@/services/offline/offline.service');
    await clearPrivateOfflineData().catch(() => undefined);
    analytics.track('auth_account_deleted', { method: 'demo' });
    return;
  }

  const client = assertSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new AppError('Not signed in', { code: 'AUTH_REQUIRED' });
  }

  const { data, error } = await client.functions.invoke('delete-account', {
    body: { confirmUserId: user.id },
  });

  if (error) {
    throw toAppError(error, 'Unable to delete account');
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new AppError(String(data.error), { code: 'DELETE_ACCOUNT' });
  }

  const { clearPrivateOfflineData } = await import('@/services/offline/offline.service');
  await clearPrivateOfflineData(user.id).catch(() => undefined);
  await client.auth.signOut().catch(() => undefined);
  analytics.track('auth_account_deleted', { method: 'supabase' });
}

export function subscribeToAuthChanges(
  callback: (user: AuthUser | null) => void,
): () => void {
  if (!env.isSupabaseConfigured || !supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    callback(
      user
        ? mapUser(
            user.id,
            user.email ?? null,
            (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              null,
          )
        : null,
    );
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export type { LocalAuthSession };
