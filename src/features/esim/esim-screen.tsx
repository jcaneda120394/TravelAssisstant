import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { useState } from 'react';

import { ChipSelect } from '@/components/forms/chip-select';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import { analytics } from '@/lib/analytics';

const COUNTRIES = ['JP', 'KR', 'PH', 'TH', 'SG', 'US', 'FR'] as const;

export function EsimScreen() {
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>('JP');

  const query = useQuery({
    queryKey: ['esim', country],
    queryFn: async () => {
      analytics.track('esim_viewed', { country });
      return providers.esim.searchByCountry(country);
    },
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-esim">
        <SectionHeader title="eSIM finder" subtitle="Mock plans — never hardcode live prices" />
        <ChipSelect
          options={COUNTRIES}
          values={[country]}
          multiple={false}
          onChange={(values) => setCountry(values[0] ?? 'JP')}
        />
        <View className="mt-4">
          {query.data?.map((plan) => (
            <Card key={plan.id} className="mb-3">
              <AppText className="font-sans-semibold text-lg">
                {plan.provider} · {plan.dataGb}GB / {plan.validityDays} days
              </AppText>
              <AppText muted className="mt-1">
                {plan.currency} {plan.price}
                {plan.supports5g ? ' · 5G' : ''}
                {plan.hotspot ? ' · Hotspot' : ''}
              </AppText>
              <AppText muted className="mt-1">
                Network: {plan.network ?? '—'} · Best for traveler / nomad comparison
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
        </View>
      </ScrollView>
    </Screen>
  );
}
