import { z } from 'zod';

export const UserFormDataSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    country: z.string().min(1, 'Country is required'),
  }),
  preferences: z
    .object({
      newsletter: z.boolean().default(false),
      notifications: z.boolean().default(true),
      theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    })
    .optional(),
});

export type UserFormData = z.infer<typeof UserFormDataSchema>;
