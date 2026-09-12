import type { Route, TransportMode } from '@/types/domain';

export type CompareFilter =
  | 'all'
  | 'recommended'
  | 'fastest'
  | 'cheapest'
  | 'least_walking'
  | 'fewest_transfers'
  | 'most_accessible'
  | 'best_for_families'
  | 'taxi_rideshare'
  | 'bus'
  | 'train';

const TAXI_MODES: TransportMode[] = ['taxi', 'rideshare', 'driving'];
const TRAIN_MODES: TransportMode[] = ['train', 'subway', 'metro', 'tram'];

function hasMode(route: Route, modes: TransportMode[]): boolean {
  return route.segments.some((segment) => modes.includes(segment.mode));
}

function costValue(route: Route): number {
  return route.estimatedCost ?? Number.POSITIVE_INFINITY;
}

/** Lower is better — balance time, walking, transfers, and fare. */
function recommendedScore(route: Route): number {
  return (
    route.durationSeconds +
    route.walkingDistanceMeters * 0.8 +
    route.transferCount * 8 * 60 +
    (route.estimatedCost ?? 6) * 90
  );
}

/** Prefer short walks, few transfers, and simple modes. */
function accessibleScore(route: Route): number {
  const hardTransit = hasMode(route, ['subway', 'metro']) ? 12 * 60 : 0;
  return (
    route.walkingDistanceMeters * 1.2 +
    route.transferCount * 10 * 60 +
    route.durationSeconds * 0.15 +
    hardTransit
  );
}

/** Prefer few transfers, less walking, and predictable modes. */
function familyScore(route: Route): number {
  return (
    route.transferCount * 12 * 60 +
    route.walkingDistanceMeters +
    route.durationSeconds * 0.2 +
    (hasMode(route, ['bus', 'train', 'subway', 'metro']) ? 0 : 3 * 60)
  );
}

function sortBy<T>(items: T[], score: (item: T) => number): T[] {
  return [...items].sort((a, b) => score(a) - score(b));
}

/**
 * Rank / filter routes for Compare chips using route attributes
 * (not only comparisonTag), so live OSRM options still work.
 */
export function filterAndSortRoutes(routes: Route[], filter: CompareFilter): Route[] {
  if (!routes.length || filter === 'all') {
    return routes;
  }

  switch (filter) {
    case 'recommended':
      return sortBy(routes, recommendedScore);
    case 'fastest':
      return sortBy(routes, (route) => route.durationSeconds);
    case 'cheapest':
      return sortBy(routes, costValue);
    case 'least_walking':
      return sortBy(routes, (route) => route.walkingDistanceMeters);
    case 'fewest_transfers':
      return sortBy(
        routes,
        (route) => route.transferCount * 1_000_000 + route.durationSeconds,
      );
    case 'most_accessible':
      return sortBy(routes, accessibleScore);
    case 'best_for_families':
      return sortBy(routes, familyScore);
    case 'taxi_rideshare': {
      const matched = routes.filter(
        (route) =>
          route.comparisonTag === 'taxi_rideshare' || hasMode(route, TAXI_MODES),
      );
      return sortBy(matched.length ? matched : routes, (route) => route.durationSeconds);
    }
    case 'bus': {
      const matched = routes.filter(
        (route) => route.comparisonTag === 'bus' || hasMode(route, ['bus']),
      );
      return sortBy(matched, (route) => route.durationSeconds);
    }
    case 'train': {
      const matched = routes.filter(
        (route) => route.comparisonTag === 'train' || hasMode(route, TRAIN_MODES),
      );
      return sortBy(matched, (route) => route.durationSeconds);
    }
    default:
      return routes;
  }
}

/**
 * Stamp each ranking winner with a comparisonTag for UI badges.
 * Mode-specific tags (bus / train / taxi) are preserved on those routes.
 */
export function applyComparisonTags(routes: Route[]): Route[] {
  if (!routes.length) {
    return routes;
  }

  const tagged = routes.map((route) => ({ ...route }));
  const used = new Set<string>();

  const claim = (route: Route | undefined, tag: NonNullable<Route['comparisonTag']>) => {
    if (!route || used.has(route.id)) {
      return;
    }
    // Keep dedicated mode tags when already set.
    if (
      route.comparisonTag === 'bus' ||
      route.comparisonTag === 'train' ||
      route.comparisonTag === 'taxi_rideshare' ||
      route.comparisonTag === 'flight'
    ) {
      used.add(route.id);
      return;
    }
    route.comparisonTag = tag;
    used.add(route.id);
  };

  claim(sortBy(tagged, recommendedScore)[0], 'recommended');
  claim(sortBy(tagged, (route) => route.durationSeconds)[0], 'fastest');
  claim(sortBy(tagged, costValue)[0], 'cheapest');
  claim(sortBy(tagged, (route) => route.walkingDistanceMeters)[0], 'least_walking');
  claim(
    sortBy(tagged, (route) => route.transferCount * 1_000_000 + route.durationSeconds)[0],
    'fewest_transfers',
  );
  claim(sortBy(tagged, accessibleScore)[0], 'most_accessible');
  claim(sortBy(tagged, familyScore)[0], 'best_for_families');

  for (const route of tagged) {
    if (route.comparisonTag) {
      continue;
    }
    if (hasMode(route, ['bus'])) {
      route.comparisonTag = 'bus';
    } else if (hasMode(route, TRAIN_MODES)) {
      route.comparisonTag = 'train';
    } else if (hasMode(route, TAXI_MODES)) {
      route.comparisonTag = 'taxi_rideshare';
    }
  }

  return tagged;
}
