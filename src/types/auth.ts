import { z } from 'zod';

import {
  ACCESSIBILITY_OPTIONS,
  BUDGET_TIERS,
  DIETARY_OPTIONS,
  TRANSPORT_PREFERENCES,
  TRAVEL_INTERESTS,
  TRAVEL_STYLES,
  WALKING_TOLERANCE,
} from '@/constants/preferences';
import { isFxCurrencyCode } from '@/constants/fx-currencies';

export const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  phone: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  admin_notes: z.string().nullable().optional(),
  onboarding_completed: z.boolean(),
  role: z.enum(['user', 'admin']).default('user'),
  is_disabled: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;

const homeCurrencySchema = z
  .string()
  .min(3)
  .max(3)
  .transform((value) => value.toUpperCase())
  .refine(isFxCurrencyCode, { message: 'Select a supported home currency' });

export const userPreferencesSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  travel_styles: z.array(z.enum(TRAVEL_STYLES)).default([]),
  interests: z.array(z.enum(TRAVEL_INTERESTS)).default([]),
  budget_tier: z.enum(BUDGET_TIERS).nullable().optional(),
  transport_preferences: z.array(z.enum(TRANSPORT_PREFERENCES)).default([]),
  home_country: z.string().nullable().optional(),
  home_currency: homeCurrencySchema.default('USD'),
  preferred_language: z.string().default('en'),
  adults: z.number().int().min(1).max(20).default(1),
  children: z.number().int().min(0).max(20).default(0),
  traveling_with_kids: z.boolean().default(false),
  kids_ages: z.array(z.number().int().min(0).max(17)).default([]),
  traveling_with_elderly: z.boolean().default(false),
  elderly_ages: z.array(z.number().int().min(55).max(120)).default([]),
  dietary_restrictions: z.array(z.enum(DIETARY_OPTIONS)).default([]),
  accessibility_requirements: z.array(z.enum(ACCESSIBILITY_OPTIONS)).default([]),
  walking_tolerance: z.enum(WALKING_TOLERANCE).nullable().optional(),
  distance_unit: z.enum(['km', 'mi']).default('km'),
  temperature_unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  time_format: z.enum(['12h', '24h']).default('24h'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const onboardingDraftSchema = z.object({
  travel_styles: z.array(z.enum(TRAVEL_STYLES)).min(1, 'Select at least one travel style'),
  interests: z.array(z.enum(TRAVEL_INTERESTS)).min(1, 'Select at least one interest'),
  budget_tier: z.enum(BUDGET_TIERS),
  transport_preferences: z
    .array(z.enum(TRANSPORT_PREFERENCES))
    .min(1, 'Select at least one transport preference'),
  home_country: z.string().min(2, 'Select your home country'),
  home_currency: homeCurrencySchema,
  preferred_language: z.string().min(2),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
  traveling_with_kids: z.boolean().default(false),
  kids_ages: z.array(z.number().int().min(0).max(17)).default([]),
  traveling_with_elderly: z.boolean().default(false),
  elderly_ages: z.array(z.number().int().min(55).max(120)).default([]),
  dietary_restrictions: z.array(z.enum(DIETARY_OPTIONS)),
  accessibility_requirements: z.array(z.enum(ACCESSIBILITY_OPTIONS)),
  walking_tolerance: z.enum(WALKING_TOLERANCE),
  distance_unit: z.enum(['km', 'mi']),
  temperature_unit: z.enum(['celsius', 'fahrenheit']),
  time_format: z.enum(['12h', '24h']),
  full_name: z.string().min(1, 'Enter your name').max(80),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export const emailPasswordSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = emailPasswordSchema.extend({
  full_name: z.string().min(1, 'Enter your name').max(80),
});

export const magicLinkSchema = z.object({
  email: z.email('Enter a valid email'),
});

export type AuthUser = {
  id: string;
  email: string | null;
  fullName: string | null;
};
