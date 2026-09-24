/**
 * Types and interfaces for XRP Payment Attestation
 */

export interface AttestationData {
  abiEncodedRequest: string;
  roundId: number | null;
}
