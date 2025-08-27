'use client';

import { useEffect, useState } from 'react';

import { Check, CheckCircle, Copy, Loader2, Play, XCircle } from 'lucide-react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { useAccount, useWaitForTransactionReceipt } from 'wagmi';

import { decodeEventLog } from 'viem';

import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  iAssetManagerAbi,
  useWriteIAssetManagerExecuteMinting,
} from '@/generated';
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFdcContracts } from '@/hooks/useFdcContracts';
import { copyToClipboardWithTimeout } from '@/lib/clipboard';
import {
  FDC_CONSTANTS,
  PaymentProofData,
  preparePaymentAttestationRequest,
  retrievePaymentDataAndProofWithRetry,
  verifyPayment,
} from '@/lib/fdcUtils';

// Form data types
const ExecuteFormDataSchema = z.object({
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

type ExecuteFormData = z.infer<typeof ExecuteFormDataSchema>;

// Execute FXRP minting
// https://dev.flare.network/fassets/reference/IAssetManager#executeminting
// https://dev.flare.network/fassets/developer-guides/fassets-mint/

export default function Execute() {
  // Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExecuteFormData>({
    resolver: zodResolver(ExecuteFormDataSchema),
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [proofData, setProofData] = useState<PaymentProofData | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null
  );
  const [transactionEvents, setTransactionEvents] = useState<{
    mintingExecuted: {
      agentVault: string;
      collateralReservationId: string;
      mintedAmountUBA: string;
      agentFeeUBA: string;
      poolFeeUBA: string;
    } | null;
    redemptionTicketCreated: {
      agentVault: string;
      redemptionTicketId: string;
      ticketValueUBA: string;
    } | null;
  } | null>(null);

  const { isConnected } = useAccount();

  // Use FAssets asset manager hook to read settings
  const {
    assetManagerAddress,
    isLoading: isLoadingSettings,
    error: assetManagerError,
  } = useAssetManager();

  // Use FDC contracts hook to read FDC contract addresses
  // https://dev.flare.network/fdc/guides/fdc-by-hand
  const {
    addresses: fdcAddresses,
    isLoading: isLoadingAddresses,
    error: addressError,
  } = useFdcContracts();

  // Write contract with executeMinting function
  // https://dev.flare.network/fassets/reference/IAssetManager#executeminting
  const {
    writeContract: executeMinting,
    data: executeHash,
    isPending: isExecutePending,
    error: writeError,
  } = useWriteIAssetManagerExecuteMinting();

  // Wait for execute minting transaction receipt
  const {
    data: receipt,
    isSuccess: isExecuteSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: executeHash });

  // Main execute minting process
  const executeMintingProcess = async (data: ExecuteFormData) => {
    const transactionId = data.transactionId.trim();
    const collateralReservationId = BigInt(data.collateralReservationId);
    const fdcRoundId = parseInt(data.fdcRoundId);

    if (!assetManagerAddress) {
      setError('AssetManager address not loaded. Please wait and try again.');
      return;
    }

    if (assetManagerError) {
      setError(`Error loading AssetManager: ${assetManagerError}`);
      return;
    }

    if (!fdcAddresses) {
      setError('FDC contract addresses not loaded. Please wait and try again.');
      return;
    }

    if (addressError) {
      setError(`Error loading FDC contract addresses: ${addressError}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCurrentStep('');
    setProofData(null);
    setVerificationResult(null);

    try {
      // Prepare attestation request
      setCurrentStep('Preparing attestation request...');
      console.log('Preparing attestation request...');

      // Prepare the attestation request using the verifier API
      // https://dev.flare.network/fdc/guides/fdc-by-hand#preparing-the-request
      const attestationResponse =
        await preparePaymentAttestationRequest(transactionId);
      console.log('Attestation response:', attestationResponse);

      // Retrieve proof from Data Availability Layer
      // https://dev.flare.network/fdc/guides/fdc-by-hand#retrieving-the-proof
      setCurrentStep('Retrieving proof from Data Availability Layer...');
      const proof = await retrievePaymentDataAndProofWithRetry(
        FDC_CONSTANTS.DA_LAYER_API_URL,
        attestationResponse.abiEncodedRequest,
        fdcRoundId,
        FDC_CONSTANTS.DA_LAYER_API_KEY
      );

      setProofData(proof);

      // Verify the payment
      // https://dev.flare.network/fdc/guides/fdc-by-hand#verifying-the-data
      setCurrentStep('Verifying payment with FDC Verification contract...');
      if (!fdcAddresses) {
        throw new Error('FDC contract addresses not loaded');
      }
      const verificationResult = await verifyPayment(proof, fdcAddresses);
      setVerificationResult(verificationResult);

      if (!verificationResult) {
        throw new Error(
          'Payment verification failed. Cannot proceed with minting.'
        );
      }

      // Execute minting on AssetManager contract
      // https://dev.flare.network/fassets/reference/IAssetManager#executeminting
      setCurrentStep('Executing minting on AssetManager contract...');
      console.log(
        'Executing minting with proof and collateral reservation ID:',
        collateralReservationId
      );

      // Execute minting on AssetManager contract
      // https://dev.flare.network/fassets/reference/IAssetManager#executeminting
      executeMinting({
        address: assetManagerAddress,
        args: [
          {
            merkleProof: proof.proof,
            data: {
              attestationType: proof.response.attestationType,
              sourceId: proof.response.sourceId,
              votingRound: BigInt(proof.response.votingRound),
              lowestUsedTimestamp: BigInt(proof.response.lowestUsedTimestamp),
              requestBody: {
                transactionId: proof.response.requestBody.transactionId,
                inUtxo: BigInt(proof.response.requestBody.inUtxo),
                utxo: BigInt(proof.response.requestBody.utxo),
              },
              responseBody: {
                blockNumber: BigInt(proof.response.responseBody.blockNumber),
                blockTimestamp: BigInt(
                  proof.response.responseBody.blockTimestamp
                ),
                sourceAddressHash:
                  proof.response.responseBody.sourceAddressHash,
                sourceAddressesRoot:
                  proof.response.responseBody.sourceAddressesRoot,
                receivingAddressHash:
                  proof.response.responseBody.receivingAddressHash,
                intendedReceivingAddressHash:
                  proof.response.responseBody.intendedReceivingAddressHash,
                spentAmount: BigInt(proof.response.responseBody.spentAmount),
                intendedSpentAmount: BigInt(
                  proof.response.responseBody.intendedSpentAmount
                ),
                receivedAmount: BigInt(
                  proof.response.responseBody.receivedAmount
                ),
                intendedReceivedAmount: BigInt(
                  proof.response.responseBody.intendedReceivedAmount
                ),
                standardPaymentReference:
                  proof.response.responseBody.standardPaymentReference,
                oneToOne: proof.response.responseBody.oneToOne,
                status: proof.response.responseBody.status,
              },
            },
          },
          collateralReservationId,
        ],
      });

      setCurrentStep('');
      setSuccess(
        'Minting execution initiated! Waiting for transaction confirmation...'
      );
    } catch (error) {
      console.error('Execute minting error:', error);
      setCurrentStep('');

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('execution reverted')) {
          setError(
            'Transaction failed: The contract rejected the transaction. This could be due to invalid proof data, expired reservation, or network issues.'
          );
        } else if (error.message.includes('insufficient funds')) {
          setError(
            'Insufficient funds to complete the transaction. Please check your wallet balance.'
          );
        } else if (
          error.message.includes('user rejected') ||
          error.message.includes('User denied transaction signature')
        ) {
          setError('Transaction was cancelled by the user.');
        } else if (
          error.message.includes('reservation not found') ||
          error.message.includes('collateral reservation')
        ) {
          setError(
            'Collateral reservation not found or has expired. Please check the reservation ID and try again.'
          );
        } else if (error.message.includes('proof verification failed')) {
          setError(
            'Proof verification failed. The provided proof data is invalid or has expired.'
          );
        } else if (error.message.includes('DA Layer request failed')) {
          setError(
            'Failed to retrieve proof from Data Availability Layer. Please check the FDC Round ID and try again.'
          );
        } else if (error.message.includes('Payment verification failed')) {
          setError(
            'Payment verification failed. The XRP transaction could not be verified.'
          );
        } else {
          setError(`Failed to execute minting: ${error.message}`);
        }
      } else {
        setError('Failed to execute minting: An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          'Transaction failed: The contract rejected the transaction. This could be due to invalid proof data, expired reservation, or network issues.'
        );
      } else if (writeError.message.includes('insufficient funds')) {
        setError(
          'Insufficient funds to complete the transaction. Please check your wallet balance.'
        );
      } else if (
        writeError.message.includes('reservation not found') ||
        writeError.message.includes('collateral reservation')
      ) {
        setError(
          'Collateral reservation not found or has expired. Please check the reservation ID and try again.'
        );
      } else if (writeError.message.includes('proof verification failed')) {
        setError(
          'Proof verification failed. The provided proof data is invalid or has expired.'
        );
      } else {
        setError(`Transaction failed: ${writeError.message}`);
      }
    }
  }, [writeError]);

  // Handle receipt errors
  useEffect(() => {
    if (receiptError) {
      console.error('Transaction receipt error:', receiptError);

      setError(
        `Transaction receipt failed: ${receiptError instanceof Error ? receiptError.message : String(receiptError)}`
      );
    }
  }, [receiptError]);

  // Handle transaction success and decode any errors
  useEffect(() => {
    if (isExecuteSuccess && receipt) {
      console.log('Execute transaction successful, processing logs...');
      console.log('Transaction details:', {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        logsCount: receipt.logs.length,
        status: receipt.status,
      });

      // Log transaction status for debugging
      console.log('Transaction status:', receipt.status, typeof receipt.status);

      // Check if transaction failed (status 0)
      if (String(receipt.status) === '0') {
        console.error('Transaction failed with status 0');

        // Try to decode error from logs
        for (const log of receipt.logs) {
          try {
            // Try to decode as various error events
            const decodedLog = decodeEventLog({
              abi: iAssetManagerAbi,
              data: log.data,
              topics: log.topics,
            });

            console.log(
              `Decoded error event: ${decodedLog.eventName}`,
              decodedLog.args
            );

            // Handle specific error events - check for any error events
            if (
              decodedLog.eventName &&
              typeof decodedLog.eventName === 'string'
            ) {
              console.error(`=== ${decodedLog.eventName} Error ===`);
              console.error(
                'Transaction failed with error event:',
                decodedLog.eventName
              );
              console.error('Error arguments:', decodedLog.args);

              // Handle specific known errors
              if (
                decodedLog.eventName.includes('Invalid') ||
                decodedLog.eventName.includes('CrtId')
              ) {
                console.error(
                  'This appears to be an invalid collateral reservation ID error.'
                );
                console.error('Please check that:');
                console.error('1. The collateral reservation ID exists');
                console.error('2. The reservation has not expired');
                console.error('3. The reservation belongs to the correct user');
                console.error('=====================================');

                setError(
                  'Invalid Collateral Reservation ID: The provided reservation ID does not exist or has expired. Please check your reservation ID and try again.'
                );
                return;
              }
            }
          } catch (error) {
            // This log is not a recognized error event, continue to next log
            console.log(
              'Log could not be decoded as known error event:',
              log,
              error
            );
          }
        }

        // If no specific error was decoded, show generic failure message
        setError(
          'Transaction failed: The contract rejected the transaction. This could be due to invalid parameters, expired reservation, or insufficient funds.'
        );
        return;
      }

      const events: {
        mintingExecuted: {
          agentVault: string;
          collateralReservationId: string;
          mintedAmountUBA: string;
          agentFeeUBA: string;
          poolFeeUBA: string;
        } | null;
        redemptionTicketCreated: {
          agentVault: string;
          redemptionTicketId: string;
          ticketValueUBA: string;
        } | null;
      } = {
        mintingExecuted: null,
        redemptionTicketCreated: null,
      };

      // Process each log in the transaction receipt
      // Decode the logs for various events:
      // * MintingExecuted: https://dev.flare.network/fassets/reference/IAssetManagerEvents#mintingexecuted
      // * RedemptionTicketCreated: https://dev.flare.network/fassets/reference/IAssetManagerEvents#redemptionticketcreated
      for (const log of receipt.logs) {
        try {
          // Try to decode the log as various events
          const decodedLog = decodeEventLog({
            abi: iAssetManagerAbi,
            data: log.data,
            topics: log.topics,
          });

          console.log(
            `Decoded event: ${decodedLog.eventName}`,
            decodedLog.args
          );

          if (decodedLog.eventName === 'MintingExecuted') {
            console.log('=== MintingExecuted Event ===');
            console.log('Agent Vault:', decodedLog.args.agentVault);
            console.log(
              'Collateral Reservation ID:',
              decodedLog.args.collateralReservationId.toString()
            );
            console.log(
              'Minted Amount UBA:',
              decodedLog.args.mintedAmountUBA.toString()
            );
            console.log(
              'Agent Fee UBA:',
              decodedLog.args.agentFeeUBA.toString()
            );
            console.log('Pool Fee UBA:', decodedLog.args.poolFeeUBA.toString());
            console.log('=====================================');

            events.mintingExecuted = {
              agentVault: decodedLog.args.agentVault,
              collateralReservationId:
                decodedLog.args.collateralReservationId.toString(),
              mintedAmountUBA: decodedLog.args.mintedAmountUBA.toString(),
              agentFeeUBA: decodedLog.args.agentFeeUBA.toString(),
              poolFeeUBA: decodedLog.args.poolFeeUBA.toString(),
            };
          } else if (decodedLog.eventName === 'RedemptionTicketCreated') {
            console.log('=== RedemptionTicketCreated Event ===');
            console.log('Agent Vault:', decodedLog.args.agentVault);
            console.log(
              'Redemption Ticket ID:',
              decodedLog.args.redemptionTicketId.toString()
            );
            console.log(
              'Ticket Value UBA:',
              decodedLog.args.ticketValueUBA.toString()
            );
            console.log('=====================================');

            events.redemptionTicketCreated = {
              agentVault: decodedLog.args.agentVault,
              redemptionTicketId: decodedLog.args.redemptionTicketId.toString(),
              ticketValueUBA: decodedLog.args.ticketValueUBA.toString(),
            };
          }
        } catch (error) {
          // This log is not a recognized event, continue to next log
          console.log('Log could not be decoded as known event:', log, error);
        }
      }

      // Store events in state for UI display
      if (Object.keys(events).length > 0) {
        setTransactionEvents(events);
      }

      setSuccess(
        `Minting executed successfully! Transaction hash: ${receipt.transactionHash}`
      );
    }
  }, [isExecuteSuccess, receipt]);

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-orange-900'>
            <Play className='h-5 w-5 text-orange-600' />
            Execute Minting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-orange-700 mb-6'>
            Execute AssetManager.executeMinting with proof verification for XRP
            transactions.
          </p>

          <form
            onSubmit={handleSubmit(executeMintingProcess)}
            className='space-y-6'
          >
            <div className='space-y-2'>
              <Label
                htmlFor='collateralReservationId'
                className='text-orange-900'
              >
                Collateral Reservation ID
              </Label>
              <Input
                {...register('collateralReservationId')}
                id='collateralReservationId'
                placeholder='123'
                className={`border-orange-300 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.collateralReservationId
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {errors.collateralReservationId && (
                <p className='text-sm text-red-600'>
                  {errors.collateralReservationId.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='fdcRoundId' className='text-orange-900'>
                FDC Round ID
              </Label>
              <Input
                {...register('fdcRoundId')}
                id='fdcRoundId'
                placeholder='456'
                className={`border-orange-300 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.fdcRoundId
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {errors.fdcRoundId && (
                <p className='text-sm text-red-600'>
                  {errors.fdcRoundId.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='transactionId' className='text-orange-900'>
                XRP Transaction ID
              </Label>
              <Input
                {...register('transactionId')}
                id='transactionId'
                placeholder='85B182F7B250BF8CB23531ECA5B508C0F66E8B7AEF7C8EE0CF851A7B2F8A9EB1'
                className={`border-orange-300 focus:ring-orange-500 focus:border-orange-500 ${
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

            {(isLoadingSettings || isLoadingAddresses) && (
              <Alert className='bg-orange-50 border-orange-200 text-orange-800'>
                <AlertDescription>
                  <div className='flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Loading contract addresses...
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {(assetManagerError || addressError) && (
              <Alert variant='destructive'>
                <XCircle className='h-4 w-4' />
                <AlertDescription>
                  {assetManagerError &&
                    `Error loading AssetManager: ${assetManagerError}`}
                  {addressError &&
                    `Error loading FDC contract addresses: ${addressError}`}
                </AlertDescription>
              </Alert>
            )}

            {!isConnected && !isLoadingSettings && !isLoadingAddresses && (
              <Alert className='bg-yellow-50 border-yellow-200 text-yellow-800'>
                <AlertDescription>
                  Please connect your wallet to execute minting on the
                  blockchain.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type='submit'
              disabled={
                isLoading ||
                !isConnected ||
                isLoadingSettings ||
                isLoadingAddresses ||
                !!assetManagerError ||
                !!addressError ||
                isExecutePending
              }
              className='w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400'
            >
              {isLoading || isExecutePending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {currentStep || 'Executing Minting...'}
                </>
              ) : (
                <>
                  <Play className='mr-2 h-4 w-4' />
                  Execute Minting
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
                  Please wait while the minting execution process completes.
                  This may take several minutes.
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

            {verificationResult !== null && (
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold text-orange-900'>
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
                <h3 className='text-lg font-semibold text-orange-900'>
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

            {transactionEvents && (
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold text-orange-900'>
                  Transaction Events
                </h3>

                {transactionEvents?.mintingExecuted && (
                  <div className='space-y-3'>
                    <h4 className='text-md font-semibold text-orange-800'>
                      MintingExecuted Event
                    </h4>
                    <div className='bg-orange-50 border border-orange-200 rounded p-4 space-y-2'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-orange-900'>
                          Agent Vault:
                        </span>
                        <code className='px-2 py-1 bg-orange-100 rounded text-sm font-mono flex-1'>
                          {transactionEvents.mintingExecuted!.agentVault}
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboardWithTimeout(
                              transactionEvents.mintingExecuted!.agentVault,
                              setCopiedText
                            )
                          }
                          className='h-6 w-6 p-0 hover:bg-orange-200 rounded'
                        >
                          {copiedText ===
                          transactionEvents.mintingExecuted!.agentVault ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-orange-500' />
                          )}
                        </button>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-orange-900'>
                          Collateral Reservation ID:
                        </span>
                        <code className='px-2 py-1 bg-orange-100 rounded text-sm font-mono flex-1'>
                          {
                            transactionEvents.mintingExecuted!
                              .collateralReservationId
                          }
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboardWithTimeout(
                              transactionEvents.mintingExecuted!
                                .collateralReservationId,
                              setCopiedText
                            )
                          }
                          className='h-6 w-6 p-0 hover:bg-orange-200 rounded'
                        >
                          {copiedText ===
                          transactionEvents.mintingExecuted!
                            .collateralReservationId ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-orange-500' />
                          )}
                        </button>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-orange-900'>
                          Minted Amount UBA:
                        </span>
                        <code className='px-2 py-1 bg-orange-100 rounded text-sm font-mono flex-1'>
                          {transactionEvents.mintingExecuted!.mintedAmountUBA}
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboardWithTimeout(
                              transactionEvents.mintingExecuted!
                                .mintedAmountUBA,
                              setCopiedText
                            )
                          }
                          className='h-6 w-6 p-0 hover:bg-orange-200 rounded'
                        >
                          {copiedText ===
                          transactionEvents.mintingExecuted!.mintedAmountUBA ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-orange-500' />
                          )}
                        </button>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-orange-900'>
                          Agent Fee UBA:
                        </span>
                        <code className='px-2 py-1 bg-orange-100 rounded text-sm font-mono flex-1'>
                          {transactionEvents.mintingExecuted!.agentFeeUBA}
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboardWithTimeout(
                              transactionEvents.mintingExecuted!.agentFeeUBA,
                              setCopiedText
                            )
                          }
                          className='h-6 w-6 p-0 hover:bg-orange-200 rounded'
                        >
                          {copiedText ===
                          transactionEvents.mintingExecuted!.agentFeeUBA ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-orange-500' />
                          )}
                        </button>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-orange-900'>
                          Pool Fee UBA:
                        </span>
                        <code className='px-2 py-1 bg-orange-100 rounded text-sm font-mono flex-1'>
                          {transactionEvents.mintingExecuted!.poolFeeUBA}
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboardWithTimeout(
                              transactionEvents.mintingExecuted!.poolFeeUBA,
                              setCopiedText
                            )
                          }
                          className='h-6 w-6 p-0 hover:bg-orange-200 rounded'
                        >
                          {copiedText ===
                          transactionEvents.mintingExecuted!.poolFeeUBA ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-orange-500' />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {transactionEvents?.redemptionTicketCreated && (
                  <div className='space-y-3'>
                    <h4 className='text-md font-semibold text-orange-800'>
                      RedemptionTicketCreated Event
                    </h4>
                    <div className='bg-orange-50 border border-orange-200 rounded p-4 space-y-2'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-orange-900'>
                          Agent Vault:
                        </span>
                        <code className='px-2 py-1 bg-orange-100 rounded text-sm font-mono flex-1'>
                          {
                            transactionEvents.redemptionTicketCreated!
                              .agentVault
                          }
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboardWithTimeout(
                              transactionEvents.redemptionTicketCreated!
                                .agentVault,
                              setCopiedText
                            )
                          }
                          className='h-6 w-6 p-0 hover:bg-orange-200 rounded'
                        >
                          {copiedText ===
                          transactionEvents.redemptionTicketCreated!
                            .agentVault ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-orange-500' />
                          )}
                        </button>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-orange-900'>
                          Redemption Ticket ID:
                        </span>
                        <code className='px-2 py-1 bg-orange-100 rounded text-sm font-mono flex-1'>
                          {
                            transactionEvents.redemptionTicketCreated!
                              .redemptionTicketId
                          }
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboardWithTimeout(
                              transactionEvents.redemptionTicketCreated!
                                .redemptionTicketId,
                              setCopiedText
                            )
                          }
                          className='h-6 w-6 p-0 hover:bg-orange-200 rounded'
                        >
                          {copiedText ===
                          transactionEvents.redemptionTicketCreated!
                            .redemptionTicketId ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-orange-500' />
                          )}
                        </button>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-orange-900'>
                          Ticket Value UBA:
                        </span>
                        <code className='px-2 py-1 bg-orange-100 rounded text-sm font-mono flex-1'>
                          {
                            transactionEvents.redemptionTicketCreated!
                              .ticketValueUBA
                          }
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboardWithTimeout(
                              transactionEvents.redemptionTicketCreated!
                                .ticketValueUBA,
                              setCopiedText
                            )
                          }
                          className='h-6 w-6 p-0 hover:bg-orange-200 rounded'
                        >
                          {copiedText ===
                          transactionEvents.redemptionTicketCreated!
                            .ticketValueUBA ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-orange-500' />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
