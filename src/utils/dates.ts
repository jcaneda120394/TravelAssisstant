export function toIsoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysIso(days: number, from = new Date()): string {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return toIsoDate(next);
}

export function defaultTripDates() {
  return {
    startDate: toIsoDate(),
    endDate: addDaysIso(7),
  };
}
