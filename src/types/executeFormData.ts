import { z } from 'zod';

export const ExecuteFormDataSchema = z.object({
  collateralReservationId: z
    .string()
    .min(1, 'Collateral reservation ID is required')
    .refine(
      val => /^\d+$/.test(val.trim()),
      'Collateral reservation ID must be a valid number'
    ),
  fdcRoundId: z
    .string()
    .min(1, 'FDC round ID is required')
    .refine(
      val => /^\d+$/.test(val.trim()),
      'FDC round ID must be a valid number'
    ),
  transactionId: z
    .string()
    .min(1, 'Transaction ID is required')
    .refine(
      val => /^[A-F0-9]{64}$/i.test(val.trim()),
      'Transaction ID must be a valid 64-character hexadecimal XRPL transaction ID'
    ),
});

export type ExecuteFormData = z.infer<typeof ExecuteFormDataSchema>;

// Re-export the proof data types from attestationFormData
export type {
  ProofData,
  ProofResponse,
  RequestBody,
  ResponseBody,
} from './attestationFormData';
