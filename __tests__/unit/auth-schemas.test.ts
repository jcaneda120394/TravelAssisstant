import {
  emailPasswordSchema,
  onboardingDraftSchema,
  signupSchema,
} from '@/types/auth';

describe('auth schemas', () => {
  it('accepts valid signup payload', () => {
    const result = signupSchema.safeParse({
      full_name: 'Alex Traveler',
      email: 'alex@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short passwords', () => {
    const result = emailPasswordSchema.safeParse({
      email: 'alex@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('requires travel styles and interests for onboarding', () => {
    const result = onboardingDraftSchema.safeParse({
      full_name: 'Alex',
      travel_styles: [],
      interests: ['food'],
      budget_tier: 'budget',
      transport_preferences: ['walking'],
      home_country: 'PH',
      home_currency: 'PHP',
      preferred_language: 'en',
      adults: 1,
      children: 0,
      dietary_restrictions: [],
      accessibility_requirements: [],
      walking_tolerance: 'medium',
      distance_unit: 'km',
      temperature_unit: 'celsius',
      time_format: '24h',
    });
    expect(result.success).toBe(false);
  });
});
