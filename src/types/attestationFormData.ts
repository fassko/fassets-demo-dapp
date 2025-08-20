import { z } from 'zod';

export const AttestationFormDataSchema = z.object({
  transactionId: z.string()
    .min(1, 'Transaction ID is required')
    .refine(
      (val) => /^[A-F0-9]{64}$/i.test(val.trim()),
      'Transaction ID must be a valid 64-character hexadecimal XRPL transaction ID'
    )
});

export type AttestationFormData = z.infer<typeof AttestationFormDataSchema>;
