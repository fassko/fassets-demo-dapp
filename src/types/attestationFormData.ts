import { z } from 'zod';

export const AttestationFormDataSchema = z.object({
  transactionId: z
    .string()
    .min(1, 'Transaction ID is required')
    .refine(
      val => /^[A-F0-9]{64}$/i.test(val.trim()),
      'Transaction ID must be a valid 64-character hexadecimal XRPL transaction ID'
    ),
});

export type AttestationFormData = z.infer<typeof AttestationFormDataSchema>;

// Types for proof data response - matches IPaymentVerification ABI
export interface RequestBody {
  transactionId: `0x${string}`;
  inUtxo: bigint;
  utxo: bigint;
}

export interface ResponseBody {
  blockNumber: bigint;
  blockTimestamp: bigint;
  sourceAddressHash: `0x${string}`;
  sourceAddressesRoot: `0x${string}`;
  receivingAddressHash: `0x${string}`;
  intendedReceivingAddressHash: `0x${string}`;
  spentAmount: bigint;
  intendedSpentAmount: bigint;
  receivedAmount: bigint;
  intendedReceivedAmount: bigint;
  standardPaymentReference: `0x${string}`;
  oneToOne: boolean;
  status: number;
}

export interface ProofResponse {
  attestationType: `0x${string}`;
  sourceId: `0x${string}`;
  votingRound: number;
  lowestUsedTimestamp: number;
  requestBody: RequestBody;
  responseBody: ResponseBody;
}

export interface ProofData {
  response: ProofResponse;
  proof: `0x${string}`[];
}
