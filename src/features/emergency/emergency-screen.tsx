import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { PlaceCard } from '@/components/cards/place-card';
import { CountrySelect } from '@/components/forms/country-select';
import { LocationPickerModal } from '@/components/location/location-picker-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import {
  countryCodeFromName,
  countryNameForCode,
  getEmergencyNumbers,
  loadCountryEmbassies,
  loadCountryPolice,
  loadNearMeEmergencyPlaces,
} from '@/services/emergency/emergency.service';

const NEAR_LABELS = {
  hospital: 'Hospitals near you',
  clinic: 'Clinics near you',
  pharmacy: 'Pharmacies near you',
} as const;

export function EmergencyScreen() {
  const router = useRouter();
  const { preferences } = useAuth();
  const { coords, label, country, hasLocation } = useEnsureLocation({
    auto: true,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const inferredHost = countryCodeFromName(country) ?? preferences?.home_country ?? 'PH';
  const [hostCountry, setHostCountry] = useState(inferredHost);
  const [hostTouched, setHostTouched] = useState(false);
  const homeCountry = preferences?.home_country ?? 'PH';

  useEffect(() => {
    if (hostTouched) {
      return;
    }
    const fromLocation = countryCodeFromName(country);
    if (fromLocation) {
      setHostCountry(fromLocation);
    }
  }, [country, hostTouched]);

  const numbers = useMemo(() => getEmergencyNumbers(hostCountry), [hostCountry]);

  const nearMeQuery = useQuery({
    queryKey: ['emergency-near', coords?.latitude, coords?.longitude],
    enabled: hasLocation && Boolean(coords),
    queryFn: () => loadNearMeEmergencyPlaces(coords!),
    staleTime: 60_000,
  });

  const policeQuery = useQuery({
    queryKey: ['emergency-police', hostCountry],
    queryFn: () => loadCountryPolice(hostCountry),
    staleTime: 5 * 60_000,
  });

  const embassyQuery = useQuery({
    queryKey: ['emergency-embassy', homeCountry, hostCountry],
    enabled: homeCountry.toUpperCase() !== hostCountry.toUpperCase(),
    queryFn: () =>
      loadCountryEmbassies({
        homeCountryCode: homeCountry,
        hostCountryCode: hostCountry,
      }),
    staleTime: 5 * 60_000,
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-10" testID="screen-emergency">
        <SectionHeader
          title="Emergency"
          subtitle="Medical help near your set location · police & embassy by country"
        />

        <Card className="mb-4 border-red-300">
          <AppText className="font-sans-bold text-lg">Local emergency numbers</AppText>
          <AppText muted className="mt-2 text-sm">
            For {numbers.countryName}. Always verify with official sources on the ground.
          </AppText>
          <View className="mt-3">
            <CountrySelect
              label="I am currently in"
              value={hostCountry}
              onChange={(code) => {
                setHostTouched(true);
                setHostCountry(code);
              }}
            />
          </View>
          <AppText muted className="mb-2 text-sm">
            Traveler nationality: {countryNameForCode(homeCountry)} — embassies use this, not GPS.
          </AppText>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label={`Police ${numbers.police}`}
                variant="secondary"
                onPress={() => void Linking.openURL(`tel:${numbers.police}`)}
              />
            </View>
            <View className="flex-1">
              <Button
                label={`Ambulance ${numbers.ambulance}`}
                onPress={() => void Linking.openURL(`tel:${numbers.ambulance}`)}
              />
            </View>
          </View>
          {numbers.fire !== numbers.ambulance ? (
            <View className="mt-2">
              <Button
                label={`Fire ${numbers.fire}`}
                variant="secondary"
                onPress={() => void Linking.openURL(`tel:${numbers.fire}`)}
              />
            </View>
          ) : null}
        </Card>

        <Card className="mb-4">
          <SectionHeader
            title="Near your location"
            subtitle={
              hasLocation
                ? label ?? 'Using your set city / GPS'
                : 'Choose a city or enable GPS for hospitals, clinics, pharmacies'
            }
          />
          <View className="mb-3">
            <Button label="Choose city" variant="secondary" onPress={() => setPickerOpen(true)} />
          </View>

          {!hasLocation ? (
            <AppText muted className="mb-2 text-sm">
              Set your location to load hospitals, clinics, and pharmacies near you.
            </AppText>
          ) : null}

          {nearMeQuery.isLoading ? (
            <View className="gap-3">
              <Skeleton height={88} />
              <Skeleton height={88} />
            </View>
          ) : null}

          {nearMeQuery.data?.map((group) => (
            <View key={group.category} className="mb-3">
              <AppText className="mb-2 font-sans-semibold">{NEAR_LABELS[group.category]}</AppText>
              {group.places.length ? (
                group.places.map((place) => <PlaceCard key={place.id} place={place} />)
              ) : (
                <AppText muted className="mb-3 text-sm">
                  No {group.category} found nearby. Try a wider city or Explore.
                </AppText>
              )}
            </View>
          ))}
        </Card>

        <Card className="mb-4">
          <SectionHeader
            title="Police (by country)"
            subtitle={`Listings for ${numbers.countryName} — not based on GPS radius`}
          />
          {policeQuery.isLoading ? <Skeleton height={88} /> : null}
          {policeQuery.data?.map((place) => <PlaceCard key={place.id} place={place} />)}
          {!policeQuery.isLoading && (policeQuery.data?.length ?? 0) === 0 ? (
            <AppText muted className="text-sm">
              No police listings found. Use the emergency number above.
            </AppText>
          ) : null}
        </Card>

        <Card className="mb-4">
          <SectionHeader
            title="Embassy / consulate"
            subtitle={
              homeCountry.toUpperCase() === hostCountry.toUpperCase()
                ? `You’re marked as in ${countryNameForCode(homeCountry)} — pick a different host country for embassy search.`
                : `${countryNameForCode(homeCountry)} missions in ${numbers.countryName} — nationality-based, not nearby GPS`
            }
          />
          {embassyQuery.isLoading ? <Skeleton height={88} /> : null}
          {embassyQuery.data?.map((place) => <PlaceCard key={place.id} place={place} />)}
          {!embassyQuery.isLoading &&
          homeCountry.toUpperCase() !== hostCountry.toUpperCase() &&
          (embassyQuery.data?.length ?? 0) === 0 ? (
            <AppText muted className="text-sm">
              No embassy match found. Check your foreign ministry site for official contacts.
            </AppText>
          ) : null}
        </Card>

        <Button
          label="Ask AI Emergency mode"
          variant="ghost"
          onPress={() => router.push('/assistant')}
        />
      </ScrollView>

      <LocationPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onChanged={() => void nearMeQuery.refetch()}
      />
    </Screen>
  );
}
