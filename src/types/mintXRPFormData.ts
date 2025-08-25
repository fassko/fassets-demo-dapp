import { z } from 'zod';

export const MintXRPFormDataSchema = z.object({
  agentVault: z.string().min(1, 'Agent vault address is required'),
  lots: z
    .string()
    .min(1, 'Lots amount is required')
    .refine(
      val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Lots must be a positive number'
    )
    .refine(
      val => Number.isInteger(parseFloat(val)),
      'Lots must be a whole number (no decimals)'
    ),
});

export type MintXRPFormData = z.infer<typeof MintXRPFormDataSchema>;
