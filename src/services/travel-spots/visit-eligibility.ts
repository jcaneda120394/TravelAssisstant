/** Pure visit eligibility used by service + unit tests. */
export function hasVisitedFromSources(
  placeId: string,
  sources: {
    checkInPlaceIds: Iterable<string>;
    pastItineraryPlaceIds: Iterable<string>;
  },
): boolean {
  const checkIns = sources.checkInPlaceIds instanceof Set
    ? sources.checkInPlaceIds
    : new Set(sources.checkInPlaceIds);
  if (checkIns.has(placeId)) {
    return true;
  }
  const past = sources.pastItineraryPlaceIds instanceof Set
    ? sources.pastItineraryPlaceIds
    : new Set(sources.pastItineraryPlaceIds);
  return past.has(placeId);
}

export function todayUtcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
