export interface SendFXRPState {
  recipientAddress: string;
  amount: string;
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}