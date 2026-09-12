import { useQuery } from '@tanstack/react-query';

import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView } from '@/components/ui/primitives';
import { Skeleton } from '@/components/feedback/skeleton';
import { providers } from '@/providers/registry';
import { useLocationStore } from '@/stores/location-store';
import { useResolvedCoords } from '@/services/location/location.service';

export function WeatherScreen() {
  const coords = useResolvedCoords();
  const label = useLocationStore((state) => state.label) ?? 'Current area';

  const current = useQuery({
    queryKey: ['weather-current', coords],
    queryFn: () => providers.weather.getCurrentWeather(label),
  });

  const daily = useQuery({
    queryKey: ['weather-daily', coords],
    queryFn: () => providers.weather.getDailyForecast(label),
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-weather">
        <SectionHeader title="Weather" subtitle={label} />
        {current.isLoading ? <Skeleton height={120} /> : null}
        {current.data ? (
          <Card className="mb-4">
            <AppText className="font-sans-bold text-3xl">{current.data.temperatureC}°C</AppText>
            <AppText muted className="mt-2">{current.data.condition}</AppText>
            <AppText muted className="mt-1">
              Humidity {current.data.humidityPercent ?? '—'}% · Wind {current.data.windKph ?? '—'} kph · UV{' '}
              {current.data.uvIndex ?? '—'}
            </AppText>
            {current.data.isMock ? (
              <AppText className="mt-2 text-sm text-accent-600">Mock weather — not a live forecast.</AppText>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <SectionHeader title="Forecast" subtitle="Used by AI planner when available" />
          {daily.data?.map((day, index) => (
            <AppText key={`${day.fetchedAt}-${index}`} muted className="mb-2">
              Day {index + 1}: {day.temperatureC}°C · {day.condition}
            </AppText>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
