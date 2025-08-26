import { z } from 'zod';

export const SendFXRPFormDataSchema = z.object({
  recipientAddress: z
    .string()
    .min(1, 'Recipient address is required')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Flare address format'),
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

export type SendFXRPFormData = z.infer<typeof SendFXRPFormDataSchema>;
