import { z } from 'zod';

export const RedeemXRPFormDataSchema = z.object({
  xrplAddress: z
    .string()
    .min(25, 'Address is too short')
    .max(35, 'Address is too long')
    .regex(/^r[1-9A-Za-km-z]{20,34}$/, 'Invalid XRPL address'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Amount must be a positive number'
    )
    .refine(
      val => parseFloat(val) <= 1000000,
      'Amount cannot exceed 1,000,000'
    ),
});

export type RedeemXRPFormData = z.infer<typeof RedeemXRPFormDataSchema>;
