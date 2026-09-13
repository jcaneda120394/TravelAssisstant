import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { DatePickerField } from '@/components/forms/date-picker-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { Skeleton } from '@/components/feedback/skeleton';
import { providers } from '@/providers/registry';
import { useLocationStore } from '@/stores/location-store';
import { useResolvedCoords } from '@/services/location/location.service';
import { addDaysIso, formatDayLabel, toLocalIsoDate } from '@/utils/dates';

const FORECAST_MAX_DAYS = 16;

export function WeatherScreen() {
  const coords = useResolvedCoords();
  const label = useLocationStore((state) => state.label) ?? 'Current area';
  const today = toLocalIsoDate();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDaysIso(6));

  const locationKey = coords
    ? `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`
    : label;

  const current = useQuery({
    queryKey: ['weather-current', locationKey],
    queryFn: () => providers.weather.getCurrentWeather(coords ?? label),
  });

  const daily = useQuery({
    queryKey: ['weather-daily', locationKey, startDate, endDate],
    queryFn: () =>
      providers.weather.getDailyForecast(coords ?? label, {
        startDate,
        endDate,
      }),
  });

  const rangeHint = useMemo(() => {
    if (startDate === endDate) {
      return formatDayLabel(startDate);
    }
    return `${formatDayLabel(startDate)} → ${formatDayLabel(endDate)}`;
  }, [startDate, endDate]);

  const applyPreset = (days: number) => {
    const start = toLocalIsoDate();
    setStartDate(start);
    setEndDate(addDaysIso(Math.min(days, FORECAST_MAX_DAYS) - 1));
  };

  return (
    <Screen>
      <ResponsiveScrollView className="flex-1 px-5 pt-4" testID="screen-weather">
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

        <Card className="mb-4">
          <SectionHeader
            title="Forecast dates"
            subtitle="Pick the days you care about — up to 16 days ahead"
          />
          <DatePickerField
            label="From"
            value={startDate}
            allowPast
            maximumDate={new Date(`${addDaysIso(FORECAST_MAX_DAYS - 1)}T12:00:00`)}
            onChange={(next) => {
              setStartDate(next);
              if (endDate < next) {
                setEndDate(next);
              }
            }}
          />
          <DatePickerField
            label="To"
            value={endDate}
            allowPast
            minimumDate={new Date(`${startDate}T12:00:00`)}
            maximumDate={new Date(`${addDaysIso(FORECAST_MAX_DAYS - 1)}T12:00:00`)}
            onChange={setEndDate}
          />
          <View className="mb-1 flex-row flex-wrap gap-2">
            <Button label="Next 3 days" variant="ghost" onPress={() => applyPreset(3)} />
            <Button label="Next 7 days" variant="ghost" onPress={() => applyPreset(7)} />
            <Button label="Next 14 days" variant="ghost" onPress={() => applyPreset(14)} />
          </View>
        </Card>

        <Card>
          <SectionHeader title="Forecast" subtitle={rangeHint} />
          {daily.isLoading ? (
            <View className="gap-2">
              <Skeleton height={28} />
              <Skeleton height={28} />
              <Skeleton height={28} />
            </View>
          ) : null}
          {daily.isError ? (
            <AppText muted>Could not load forecast for these dates. Try a nearer range.</AppText>
          ) : null}
          {!daily.isLoading && (daily.data?.length ?? 0) === 0 ? (
            <AppText muted>No forecast rows for this range.</AppText>
          ) : null}
          {daily.data?.map((day, index) => {
            const dateLabel = day.date ? formatDayLabel(day.date) : `Day ${index + 1}`;
            const temp =
              day.temperatureMaxC != null && day.temperatureMinC != null
                ? `${day.temperatureMinC}–${day.temperatureMaxC}°C`
                : `${day.temperatureC}°C`;
            return (
              <View
                key={`${day.date ?? day.fetchedAt}-${index}`}
                className="mb-3 border-b border-black/8 pb-3 dark:border-brand-800"
              >
                <AppText className="font-sans-semibold">{dateLabel}</AppText>
                <AppText muted className="mt-1">
                  {temp} · {day.condition}
                  {day.rainChancePercent != null ? ` · rain ${day.rainChancePercent}%` : ''}
                </AppText>
                {day.date ? (
                  <AppText muted className="mt-0.5 text-xs">
                    {day.date}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </Card>
      </ResponsiveScrollView>
    </Screen>
  );
}
