import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';

import { PlaceCard } from '@/components/cards/place-card';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { providers } from '@/providers/registry';
import { useResolvedCoords } from '@/services/location/location.service';
import type { PlaceCategory } from '@/types/domain';

const EMERGENCY_CATEGORIES: PlaceCategory[] = [
  'hospital',
  'clinic',
  'pharmacy',
  'police',
  'embassy',
];

export function EmergencyScreen() {
  const router = useRouter();
  const coords = useResolvedCoords();
  const { preferences } = useAuth();

  const query = useQuery({
    queryKey: ['emergency', coords],
    queryFn: async () => {
      const groups = await Promise.all(
        EMERGENCY_CATEGORIES.map(async (category) => ({
          category,
          places: await providers.places.getNearbyPlaces({
            location: coords,
            radiusMeters: 8000,
            category,
            limit: 3,
          }),
        })),
      );
      return groups;
    },
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-emergency">
        <SectionHeader
          title="Emergency"
          subtitle="Nearest help from PlacesProvider · verify numbers with official sources"
        />

        <Card className="mb-4 border-red-300">
          <AppText className="font-sans-bold text-lg">Local emergency numbers (sample)</AppText>
          <AppText muted className="mt-2">
            Police 110 · Ambulance/Fire 119 (Japan sample). Always confirm for your current country.
          </AppText>
          <AppText muted className="mt-2">
            Traveler nationality context: {preferences?.home_country ?? 'not set'} — embassy results
            below are mock.
          </AppText>
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button label="Call 110" variant="secondary" onPress={() => void Linking.openURL('tel:110')} />
            </View>
            <View className="flex-1">
              <Button label="Call 119" onPress={() => void Linking.openURL('tel:119')} />
            </View>
          </View>
        </Card>

        {query.data?.map((group) => (
          <View key={group.category} className="mb-4">
            <AppText className="mb-2 font-sans-semibold capitalize">
              {group.category.replace('_', ' ')}
            </AppText>
            {group.places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </View>
        ))}

        <Button label="Ask AI Emergency mode" variant="ghost" onPress={() => router.push('/assistant')} />
      </ScrollView>
    </Screen>
  );
}
