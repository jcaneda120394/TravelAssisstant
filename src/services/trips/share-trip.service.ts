import * as Linking from 'expo-linking';
import { Share, Platform } from 'react-native';

import type { Trip } from '@/types/domain';
import { formatTripDateRange } from '@/utils/dates';

export function buildTripShareUrl(tripId: string): string {
  return Linking.createURL(`trip/${tripId}`);
}

export function buildTripShareMessage(trip: Trip): string {
  const range = formatTripDateRange(trip.startDate, trip.endDate, trip.openEnded);
  const places = trip.destinations.filter(Boolean).join(' → ') || 'Trip destinations TBD';
  const url = buildTripShareUrl(trip.id);
  const summary = trip.publicSummary?.trim();
  return [
    `Check out my trip: ${trip.title}`,
    places,
    range,
    summary || null,
    '',
    `Open in TravelAssistant: ${url}`,
  ]
    .filter((line) => line != null)
    .join('\n');
}

/** Native share sheet for a trip (iOS/Android/web where supported). */
export async function shareTrip(trip: Trip): Promise<{ shared: boolean }> {
  const message = buildTripShareMessage(trip);
  const url = buildTripShareUrl(trip.id);

  const result = await Share.share(
    Platform.OS === 'ios'
      ? {
          message,
          url,
        }
      : {
          message,
          title: trip.title,
        },
  );

  if (result.action === Share.sharedAction) {
    return { shared: true };
  }
  return { shared: false };
}
