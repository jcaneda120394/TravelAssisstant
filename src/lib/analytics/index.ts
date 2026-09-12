type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Lightweight analytics facade. PostHog/Firebase wired in later phases.
 * Avoid sending precise historical location.
 */
export const analytics = {
  track(event: string, properties?: AnalyticsProps) {
    if (__DEV__) {
      console.log('[analytics]', event, properties ?? {});
    }
  },
  identify(userId: string, traits?: AnalyticsProps) {
    if (__DEV__) {
      console.log('[analytics:identify]', userId, traits ?? {});
    }
  },
  reset() {
    if (__DEV__) {
      console.log('[analytics:reset]');
    }
  },
};
