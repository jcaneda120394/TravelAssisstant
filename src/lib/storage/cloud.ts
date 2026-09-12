import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Use Supabase tables when configured and the user is a real auth UUID (not local demo). */
export function useCloudStorage(userId?: string): boolean {
  if (!env.isSupabaseConfigured || !supabase) {
    return false;
  }
  if (userId && !isUuid(userId)) {
    return false;
  }
  return true;
}
