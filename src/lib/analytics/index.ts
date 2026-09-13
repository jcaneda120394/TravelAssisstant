import { env } from '@/config/env';
import { safeLog } from '@/lib/logging/safe-log';

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Lightweight analytics facade. Avoid emails, precise location, tokens, or raw AI prompts.
 */
export const analytics = {
  track(event: string, properties?: AnalyticsProps) {
    if (!env.isProduction) {
      safeLog.debug('analytics', { event, properties });
    }
  },
  identify(userId: string, traits?: AnalyticsProps) {
    if (!env.isProduction) {
      safeLog.debug('analytics:identify', {
        userId: userId.slice(0, 8),
        traits,
      });
    }
  },
  reset() {
    if (!env.isProduction) {
      safeLog.debug('analytics:reset');
    }
  },
};
