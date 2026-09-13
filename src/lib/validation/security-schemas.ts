import { z } from 'zod';

/** Shared input bounds for user-controlled strings and numbers. */
export const safeTextSchema = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`);

export const tripTitleSchema = safeTextSchema(120).min(1, 'Enter a trip title');

export const tripNotesSchema = safeTextSchema(4000).optional().nullable();

export const destinationNameSchema = safeTextSchema(120).min(1);

export const inviteEmailSchema = z.email('Enter a valid email').max(254);

export const budgetAmountSchema = z
  .number()
  .finite()
  .min(0)
  .max(1_000_000_000);

export const travelerCountSchema = z.number().int().min(0).max(50);

export const aiMessageSchema = safeTextSchema(8000).min(1);

export const uuidSchema = z.string().uuid();

/** Reject unexpected keys by parsing with Zod object schemas (strict). */
export function parseStrict<T>(schema: z.ZodType<T>, input: unknown): T {
  return schema.parse(input);
}
