import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { useState } from 'react';

import { CountrySelect } from '@/components/forms/country-select';
import { DisplayPriceText } from '@/components/currency/display-price-text';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { providers } from '@/providers/registry';
import { analytics } from '@/lib/analytics';

export function EsimScreen() {
  const { preferences } = useAuth();
  const [country, setCountry] = useState(preferences?.home_country ?? 'JP');

  const query = useQuery({
    queryKey: ['esim', country],
    queryFn: async () => {
      analytics.track('esim_viewed', { country });
      return providers.esim.searchByCountry(country);
    },
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-10" testID="screen-esim">
        <SectionHeader title="eSIM finder" subtitle="Live catalog plans with partner purchase links" />
        <CountrySelect label="Destination country" value={country} onChange={setCountry} />

        {query.isLoading ? (
          <View className="mt-2 gap-3">
            <Skeleton height={110} />
            <Skeleton height={110} />
          </View>
        ) : null}

        <View className="mt-2">
          {query.data?.map((plan) => (
            <Card key={plan.id} className="mb-3">
              <AppText className="font-sans-semibold text-lg">
                {plan.provider} · {plan.dataGb}GB / {plan.validityDays} days
              </AppText>
              <View className="mt-1 flex-row flex-wrap items-center gap-1">
                <DisplayPriceText amount={plan.price} sourceCurrency={plan.currency} muted />
                <AppText muted>
                  {plan.supports5g ? ' · 5G' : ''}
                  {plan.hotspot ? ' · Hotspot' : ''}
                </AppText>
              </View>
              <AppText muted className="mt-1">
                Network: {plan.network ?? '—'} · {plan.countryName}
                {plan.bestFor ? ` · ${plan.bestFor}` : ''}
              </AppText>
              <View className="mt-3">
                <Button
                  label="View offer"
                  variant="secondary"
                  onPress={() => {
                    if (plan.purchaseUrl) {
                      void Linking.openURL(plan.purchaseUrl);
                    }
                  }}
                  disabled={!plan.purchaseUrl}
                />
              </View>
            </Card>
          ))}
          {!query.isLoading && (query.data?.length ?? 0) === 0 ? (
            <AppText muted>No plans listed for this country yet.</AppText>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
