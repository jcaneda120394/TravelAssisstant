export const TRAVEL_STYLES = [
  'solo',
  'couple',
  'family',
  'friends',
  'backpacker',
  'business',
  'luxury',
  'budget',
  'digital_nomad',
] as const;

export const TRAVEL_INTERESTS = [
  'food',
  'nature',
  'beaches',
  'shopping',
  'museums',
  'history',
  'theme_parks',
  'adventure',
  'hiking',
  'architecture',
  'photography',
  'culture',
  'nightlife',
  'coffee',
  'kids_activities',
  'family_activities',
  'religious_locations',
  'local_experiences',
] as const;

export const BUDGET_TIERS = [
  'backpacker',
  'budget',
  'mid_range',
  'premium',
  'luxury',
] as const;

export const TRANSPORT_PREFERENCES = [
  'walking',
  'train',
  'subway',
  'bus',
  'ferry',
  'taxi',
  'uber',
  'grab',
  'rental_car',
  'cycling',
] as const;

export const DIETARY_OPTIONS = [
  'none',
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten_free',
  'dairy_free',
  'nut_allergy',
] as const;

export const ACCESSIBILITY_OPTIONS = [
  'none',
  'wheelchair',
  'limited_mobility',
  'visual_assistance',
  'hearing_assistance',
  'elevator_required',
] as const;

export const WALKING_TOLERANCE = ['low', 'medium', 'high'] as const;

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'PHP',
  'KRW',
  'CNY',
  'AUD',
  'CAD',
  'SGD',
  'THB',
  'INR',
] as const;

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fil', label: 'Filipino' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh-Hans', label: 'Simplified Chinese' },
  { code: 'zh-Hant', label: 'Traditional Chinese' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
] as const;

export const COUNTRIES = [
  { code: 'PH', label: 'Philippines' },
  { code: 'JP', label: 'Japan' },
  { code: 'KR', label: 'South Korea' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'TH', label: 'Thailand' },
  { code: 'VN', label: 'Vietnam' },
  { code: 'ID', label: 'Indonesia' },
  { code: 'MY', label: 'Malaysia' },
  { code: 'CN', label: 'China' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'CA', label: 'Canada' },
  { code: 'NZ', label: 'New Zealand' },
] as const;

export function labelize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
