'use client';

import { useEffect, useState } from 'react';

import {
  Check,
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  XCircle,
} from 'lucide-react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { useChainId, useWaitForTransactionReceipt, useWriteContract, useConnections } from 'wagmi';

import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFdcContracts } from '@/hooks/useFdcContracts';
import { copyToClipboardWithTimeout } from '@/lib/clipboard';
import {
  FDC_CONSTANTS,
  PaymentProofData,
  calculateRoundId,
  preparePaymentAttestationRequest,
  retrievePaymentDataAndProofWithRetry,
  submitAttestationRequest,
  verifyPayment,
} from '@/lib/fdcUtils';
import { AttestationData } from '@/types/attestation';

// Form data types
const AttestationFormDataSchema = z.object({
  transactionId: z
    .string()
    .min(1, 'Transaction ID is required')
    .refine(
      val => /^[A-F0-9]{64}$/i.test(val.trim()),
      'Transaction ID must be a valid 64-character hexadecimal XRPL transaction ID'
    ),
});

type AttestationFormData = z.infer<typeof AttestationFormDataSchema>;

export default function Attestation() {
  // Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AttestationFormData>({
    resolver: zodResolver(AttestationFormDataSchema),
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [attestationData, setAttestationData] =
    useState<AttestationData | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [proofData, setProofData] = useState<PaymentProofData | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null
  );

  const chainId = useChainId();
  const connections = useConnections();
  const isConnected = connections.length > 0;

  // FDC contracts hook
  // It gets the FDC contracts from the Flare Contracts Registry
  // https://dev.flare.network/network/guides/flare-contracts-registry
  const {
    addresses: fdcAddresses,
    isLoading: isLoadingAddresses,
    error: addressError,
  } = useFdcContracts();

  // Write contract with requestAttestation function using default wagmi hook
  // https://dev.flare.network/fdc/reference/IFdcHub#requestattestation
  const {
    writeContract: requestAttestation,
    data: attestationHash,
    error: writeError,
  } = useWriteContract();

  // Wait for transaction receipt
  const { data: receipt, isSuccess: isAttestationSuccess } =
    useWaitForTransactionReceipt({ hash: attestationHash });

  // Handle transaction success and calculate round ID
  useEffect(() => {
    if (
      isAttestationSuccess &&
      receipt &&
      attestationData &&
      attestationData.roundId === null
    ) {
      const processTransaction = async () => {
        try {
          setCurrentStep('Calculating round ID from transaction...');
          if (!fdcAddresses) {
            throw new Error('FDC contract addresses not loaded');
          }
          // Calculate round ID from transaction receipt
          // https://dev.flare.network/fdc/guides/fdc-by-hand#waiting-for-the-voting-round-to-finalize
          const roundId = await calculateRoundId(
            { receipt: { blockNumber: receipt.blockNumber } },
            fdcAddresses,
            chainId
          );
          console.log('Calculated round ID:', roundId);

          // Update attestationData with the calculated round ID
          setAttestationData(prevData =>
            prevData ? { ...prevData, roundId } : null
          );

          // Start proof retrieval
          setCurrentStep('Retrieving proof from Data Availability Layer...');
          // https://dev.flare.network/fdc/guides/fdc-by-hand#preparing-the-proof-request
          const proof = await retrievePaymentDataAndProofWithRetry(
            FDC_CONSTANTS.DA_LAYER_API_URL,
            attestationData.abiEncodedRequest,
            Number(roundId),
            FDC_CONSTANTS.DA_LAYER_API_KEY
          );

          setProofData(proof);

          // Verify the payment
          // https://dev.flare.network/fdc/guides/fdc-by-hand#verifying-the-data
          setCurrentStep('Verifying payment with FDC Verification contract...');
          if (!fdcAddresses) {
            throw new Error('FDC contract addresses not loaded');
          }
          const verificationResult = await verifyPayment(
            proof,
            fdcAddresses,
            chainId
          );
          setVerificationResult(verificationResult);

          setCurrentStep('');
          setSuccess(
            `Round ID ${roundId} calculated, proof retrieved, and payment verified successfully! Verification result: ${verificationResult}`
          );
        } catch (error) {
          console.error('Error processing transaction:', error);
          setCurrentStep('');
          setError(
            error instanceof Error
              ? error.message
              : 'Error processing transaction'
          );
        }
      };

      processTransaction();
    }
  }, [isAttestationSuccess, receipt, attestationData, fdcAddresses, chainId]);

  // Handle write contract errors
  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError);

      // Handle specific error types
      if (
        writeError.message.includes('User denied transaction signature') ||
        writeError.message.includes('user rejected')
      ) {
        setError('Transaction was cancelled by the user.');
      } else if (writeError.message.includes('execution reverted')) {
        setError(
          'Transaction failed: The contract rejected the transaction. This could be due to invalid parameters, insufficient funds, or network issues.'
        );
      } else if (writeError.message.includes('insufficient funds')) {
        setError(
          'Insufficient funds to complete the transaction. Please check your wallet balance.'
        );
      } else if (writeError.message.includes('request fee')) {
        setError(
          'Insufficient request fee. Please ensure you have enough FLR to pay the attestation request fee.'
        );
      } else {
        setError(`Transaction failed: ${writeError.message}`);
      }
    }
  }, [writeError]);

  // Main attestation process
  const executeAttestation = async (data: AttestationFormData) => {
    const transactionId = data.transactionId.trim();

    if (!fdcAddresses) {
      setError('FDC contract addresses not loaded. Please wait and try again.');
      return;
    }

    if (addressError) {
      setError(`Error loading contract addresses: ${addressError}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCurrentStep('');
    setAttestationData(null);

    try {
      setCurrentStep('Preparing attestation request...');
      console.log('Preparing attestation request...');

      // Prepare the attestation request using the verifier API
      // https://dev.flare.network/fdc/guides/fdc-by-hand#preparing-the-request
      const attestationResponse =
        await preparePaymentAttestationRequest(transactionId);
      console.log('Attestation response:', attestationResponse);

      // Create attestation data structure with the real ABI encoded request
      const data: AttestationData = {
        abiEncodedRequest: attestationResponse.abiEncodedRequest,
        roundId: null, // Will be calculated after transaction
      };
      console.log('Attestation data:', data);
      setAttestationData(data);

      // Submit attestation request
      // https://dev.flare.network/fdc/guides/fdc-by-hand#submitting-the-request
      setCurrentStep('Submitting attestation request to blockchain...');
      console.log('Submitting attestation request...');
      if (!isConnected) {
        throw new Error('Please connect your wallet first');
      }
      if (!fdcAddresses) {
        throw new Error('FDC contract addresses not loaded');
      }
      await submitAttestationRequest(
        data.abiEncodedRequest,
        fdcAddresses,
        chainId,
        requestAttestation
      );

      // Wait for transaction to be mined and calculate round ID
      setCurrentStep('Waiting for transaction confirmation...');

      setCurrentStep('');
      setSuccess('Attestation request submitted! Waiting for confirmation...');
    } catch (error) {
      console.error('Attestation error:', error);
      setCurrentStep('');
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <CardTitle className='flex items-center gap-2 text-purple-900'>
              <CheckCircle className='h-5 w-5 text-purple-600' />
              XRP Payment Attestation
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className='text-purple-700 mb-6'>
            Execute Flare Data Connector XRP Payment attestation to verify XRP
            transactions.{' '}
            <a
              href='https://dev.flare.network/fdc/overview'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 hover:underline'
            >
              Learn more
              <ExternalLink className='h-3 w-3' />
            </a>
          </p>

          <form
            onSubmit={handleSubmit(executeAttestation)}
            className='space-y-6'
          >
            <div className='space-y-2'>
              <Label htmlFor='transactionId' className='text-purple-900'>
                Transaction ID
              </Label>
              <Input
                {...register('transactionId')}
                id='transactionId'
                placeholder='85B182F7B250BF8CB23531ECA5B508C0F66E8B7AEF7C8EE0CF851A7B2F8A9EB1'
                className={`border-purple-300 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.transactionId
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {errors.transactionId && (
                <p className='text-sm text-red-600'>
                  {errors.transactionId.message}
                </p>
              )}
            </div>

            {isLoadingAddresses && (
              <Alert className='bg-purple-50 border-purple-200 text-purple-800'>
                <AlertDescription>
                  <div className='flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Loading FDC contract addresses...
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {addressError && (
              <Alert variant='destructive'>
                <XCircle className='h-4 w-4' />
                <AlertDescription>
                  Error loading contract addresses: {addressError}
                </AlertDescription>
              </Alert>
            )}

            {!isConnected && !isLoadingAddresses && (
              <Alert className='bg-yellow-50 border-yellow-200 text-yellow-800'>
                <AlertDescription>
                  Please connect your wallet to submit attestation requests to
                  the blockchain.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type='submit'
              disabled={
                isLoading ||
                !isConnected ||
                isLoadingAddresses ||
                !!addressError
              }
              className='w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400'
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {currentStep || 'Executing Attestation...'}
                </>
              ) : (
                <>
                  <CheckCircle className='mr-2 h-4 w-4' />
                  Execute Attestation
                </>
              )}
            </Button>

            {isLoading && currentStep && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                <div className='flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
                  <span className='text-blue-800 font-medium'>
                    {currentStep}
                  </span>
                </div>
                <p className='text-blue-600 text-sm mt-2'>
                  Please wait while the attestation process completes. This may
                  take several minutes.
                </p>
              </div>
            )}

            {(error || writeError) && (
              <Alert variant='destructive'>
                <XCircle className='h-4 w-4' />
                <AlertDescription>
                  {error ||
                    (writeError && `Transaction Error: ${writeError.message}`)}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className='bg-green-50 border-green-200 text-green-800'>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {attestationData && (
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold text-purple-900'>
                  Attestation Data
                </h3>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>ABI Encoded Request:</span>
                    <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1'>
                      {attestationData.abiEncodedRequest.length > 20
                        ? `${attestationData.abiEncodedRequest.slice(0, 10)}...${attestationData.abiEncodedRequest.slice(-10)}`
                        : attestationData.abiEncodedRequest}
                    </code>
                    <button
                      type='button'
                      onClick={() =>
                        copyToClipboardWithTimeout(
                          attestationData.abiEncodedRequest,
                          setCopiedText
                        )
                      }
                      className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
                    >
                      {copiedText === attestationData.abiEncodedRequest ? (
                        <Check className='h-3 w-3 text-green-600' />
                      ) : (
                        <Copy className='h-3 w-3 text-gray-500' />
                      )}
                    </button>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>Round ID:</span>
                    <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1'>
                      {attestationData.roundId ?? 'Calculating...'}
                    </code>
                    {attestationData.roundId !== null && (
                      <button
                        type='button'
                        onClick={() =>
                          copyToClipboardWithTimeout(
                            attestationData.roundId!.toString(),
                            setCopiedText
                          )
                        }
                        className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
                      >
                        {copiedText === attestationData.roundId!.toString() ? (
                          <Check className='h-3 w-3 text-green-600' />
                        ) : (
                          <Copy className='h-3 w-3 text-gray-500' />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {verificationResult !== null && (
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold text-purple-900'>
                  Payment Verification Result
                </h3>
                <div className='flex items-center gap-2'>
                  <span className='font-medium'>Verification Status:</span>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      verificationResult
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {verificationResult ? '✅ Verified' : '❌ Failed'}
                  </div>
                </div>
              </div>
            )}

            {proofData && (
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold text-purple-900'>
                  Proof Data
                </h3>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>Voting Round:</span>
                    <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1'>
                      {proofData.response?.votingRound ?? 'Not available'}
                    </code>
                    {proofData.response?.votingRound && (
                      <button
                        type='button'
                        onClick={() =>
                          copyToClipboardWithTimeout(
                            proofData.response.votingRound.toString(),
                            setCopiedText
                          )
                        }
                        className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
                      >
                        {copiedText ===
                        proofData.response.votingRound.toString() ? (
                          <Check className='h-3 w-3 text-green-600' />
                        ) : (
                          <Copy className='h-3 w-3 text-gray-500' />
                        )}
                      </button>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <span className='font-medium'>Proof Array:</span>
                    <div className='space-y-1'>
                      {proofData.proof &&
                        Array.isArray(proofData.proof) &&
                        proofData.proof.map(
                          (proofItem: string, index: number) => (
                            <div
                              key={index}
                              className='flex items-center gap-2'
                            >
                              <span className='text-sm text-gray-600 w-8'>
                                [{index}]:
                              </span>
                              <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1'>
                                {proofItem.length > 20
                                  ? `${proofItem.slice(0, 10)}...${proofItem.slice(-10)}`
                                  : proofItem}
                              </code>
                              <button
                                type='button'
                                onClick={() =>
                                  copyToClipboardWithTimeout(
                                    proofItem,
                                    setCopiedText
                                  )
                                }
                                className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
                              >
                                {copiedText === proofItem ? (
                                  <Check className='h-3 w-3 text-green-600' />
                                ) : (
                                  <Copy className='h-3 w-3 text-gray-500' />
                                )}
                              </button>
                            </div>
                          )
                        )}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <span className='font-medium'>Response Body:</span>
                    <div className='bg-gray-100 rounded p-3 text-sm font-mono'>
                      <div>
                        <strong>Block Number:</strong>{' '}
                        {proofData.response?.responseBody?.blockNumber}
                      </div>
                      <div>
                        <strong>Block Timestamp:</strong>{' '}
                        {proofData.response?.responseBody?.blockTimestamp}
                      </div>
                      <div>
                        <strong>Spent Amount:</strong>{' '}
                        {proofData.response?.responseBody?.spentAmount}
                      </div>
                      <div>
                        <strong>Received Amount:</strong>{' '}
                        {proofData.response?.responseBody?.receivedAmount}
                      </div>
                      <div>
                        <strong>Status:</strong>{' '}
                        {proofData.response?.responseBody?.status}
                      </div>
                      <div>
                        <strong>One to One:</strong>{' '}
                        {proofData.response?.responseBody?.oneToOne
                          ? 'Yes'
                          : 'No'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
