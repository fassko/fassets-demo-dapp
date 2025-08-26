'use client';

import { useEffect, useState } from 'react';

import { Coins, Loader2 } from 'lucide-react';
import { flareTestnet } from 'wagmi/chains';

import { Controller, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from 'wagmi';

import { createPublicClient, decodeEventLog, http } from 'viem';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SuccessMessage } from '@/components/ui/success-message';
// Hooks and contract functions
import { useAssetManager } from '@/hooks/useAssetManager';
import { useReservationFee } from '@/hooks/useReservationFee';
// Form data schema
import {
  MintXRPFormData,
  MintXRPFormDataSchema,
} from '@/types/mintXRPFormData';

import {
  iAgentOwnerRegistryAbi,
  iAssetManagerAbi,
  useWriteIAssetManagerReserveCollateral,
} from '../generated';

export default function Mint() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<React.ReactNode | null>(null);
  const [availableAgents, setAvailableAgents] = useState<
    Array<{
      agentVault: string;
      ownerManagementAddress: string;
      feeBIPS: bigint;
      mintingVaultCollateralRatioBIPS: bigint;
      mintingPoolCollateralRatioBIPS: bigint;
      freeCollateralLots: bigint;
      status: bigint;
      agentName?: string;
    }>
  >([]);

  const [lotSizeAMG, setLotSizeAMG] = useState<string>('0');
  const {
    assetManagerAddress,
    settings,
    isLoading: isLoadingSettings,
    error: assetManagerError,
  } = useAssetManager();
  const { address: userAddress, isConnected } = useAccount();

  // Debug account and chain state
  useEffect(() => {
    console.log('Account and chain state:', {
      userAddress,
      isConnected,
      hasAddress: !!userAddress,
    });
  }, [userAddress, isConnected]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<MintXRPFormData>({
    resolver: zodResolver(MintXRPFormDataSchema),
    defaultValues: {
      agentVault: '',
      lots: '',
    },
  });

  const watchedLots = watch('lots');
  const watchedAgentVault = watch('agentVault');

  // Use the reservation fee hook
  const {
    reservationFee,
    isLoading: isLoadingFee,
    error: feeError,
    getCurrentFee,
  } = useReservationFee(
    assetManagerAddress || undefined,
    watchedLots,
    watchedAgentVault
  );

  // Read available agents
  const { data: availableAgentsData, isLoading: isLoadingAgentsData } =
    useReadContract({
      address: assetManagerAddress!,
      abi: iAssetManagerAbi,
      functionName: 'getAvailableAgentsDetailedList',
      query: {
        enabled: !!assetManagerAddress,
      },
      args: [BigInt(1), BigInt(100)],
    });

  // Write contract for reserveCollateral function
  const {
    data: reserveHash,
    writeContract: reserveContract,
    isPending: isReservePending,
    error: writeError,
  } = useWriteIAssetManagerReserveCollateral();

  // Debug wagmi hook state
  useEffect(() => {
    console.log('Wagmi hook state:', {
      reserveHash,
      isReservePending,
      writeError: writeError?.message,
      reserveContract: typeof reserveContract,
      hasWriteContract: !!reserveContract,
    });
  }, [reserveHash, isReservePending, writeError, reserveContract]);

  // Add global error handler for uncaught errors
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(`Unhandled error: ${event.reason?.message || event.reason}`);
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setError(`Global error: ${event.error?.message || event.message}`);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isReserveSuccess,
    data: receipt,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: reserveHash,
  });

  // Handle receipt errors
  useEffect(() => {
    if (receiptError) {
      console.error('Transaction receipt error:', receiptError);
      console.error('Receipt error details:', {
        name: receiptError instanceof Error ? receiptError.name : 'Unknown',
        message:
          receiptError instanceof Error
            ? receiptError.message
            : String(receiptError),
        cause: receiptError instanceof Error ? receiptError.cause : undefined,
        stack: receiptError instanceof Error ? receiptError.stack : undefined,
      });

      setError(
        `Transaction receipt failed: ${receiptError instanceof Error ? receiptError.message : String(receiptError)}`
      );
    }
  }, [receiptError]);

  // Process settings when loaded
  useEffect(() => {
    if (settings) {
      const lotSizeRaw = settings.lotSizeAMG.toString();
      const decimals = Number(settings.assetDecimals);
      const lotSizeHumanReadable = (
        Number(lotSizeRaw) / Math.pow(10, decimals)
      ).toFixed(decimals);
      setLotSizeAMG(lotSizeHumanReadable);
    }
  }, [settings]);

  // Process available agents when loaded
  useEffect(() => {
    const fetchAgentsWithNames = async () => {
      if (availableAgentsData && settings) {
        const agents = availableAgentsData[0]; // First element is the agents array
        const availableAgentsWithCollateral = agents.filter(
          agent => agent.freeCollateralLots > BigInt(0)
        );

        // Fetch agent names using manual contract calls
        const agentsWithNames = await Promise.all(
          availableAgentsWithCollateral.map(async agent => {
            try {
              // Create a contract instance for manual calls
              const client = createPublicClient({
                chain: flareTestnet,
                transport: http(),
              });

              const agentName = await client.readContract({
                address: settings.agentOwnerRegistry as `0x${string}`,
                abi: iAgentOwnerRegistryAbi,
                functionName: 'getAgentName',
                args: [agent.ownerManagementAddress],
              });

              return {
                ...agent,
                agentVault: agent.agentVault as string,
                ownerManagementAddress: agent.ownerManagementAddress as string,
                status: BigInt(agent.status),
                agentName: agentName || 'Unknown Agent',
              };
            } catch (error) {
              console.error(
                `Error fetching name for agent ${agent.agentVault}:`,
                error
              );
              return {
                ...agent,
                agentVault: agent.agentVault as string,
                ownerManagementAddress: agent.ownerManagementAddress as string,
                status: BigInt(agent.status),
                agentName: 'Unknown Agent',
              };
            }
          })
        );

        setAvailableAgents(agentsWithNames);
      }
    };

    fetchAgentsWithNames();
  }, [availableAgentsData, settings]);

  // Handle successful reservation
  useEffect(() => {
    if (isReserveSuccess && receipt) {
      console.log('Transaction receipt:', receipt);

      // Try to decode the CollateralReserved event from the transaction logs
      try {
        if (receipt.logs && receipt.logs.length > 0) {
          console.log('Transaction logs:', receipt.logs);

          // Look for CollateralReserved event
          for (const log of receipt.logs) {
            try {
              // Try to decode the log as a CollateralReserved event
              const decodedLog = decodeEventLog({
                abi: iAssetManagerAbi,
                data: log.data,
                topics: log.topics,
              });

              if (decodedLog.eventName === 'CollateralReserved') {
                console.log('CollateralReserved event decoded:', {
                  eventName: decodedLog.eventName,
                  args: decodedLog.args,
                  // The important fields from the event:
                  agentVault: decodedLog.args.agentVault,
                  minter: decodedLog.args.minter,
                  collateralReservationId:
                    decodedLog.args.collateralReservationId,
                  valueUBA: decodedLog.args.valueUBA,
                  feeUBA: decodedLog.args.feeUBA,
                  paymentAddress: decodedLog.args.paymentAddress,
                  paymentReference: decodedLog.args.paymentReference,
                  executor: decodedLog.args.executor,
                  executorFeeNatWei: decodedLog.args.executorFeeNatWei,
                });

                const totalUBA =
                  decodedLog.args.valueUBA + decodedLog.args.feeUBA;
                const totalXRP = Number(totalUBA) / 10 ** 6;
                console.log(`You need to pay ${totalXRP} XRP`);

                setSuccess(
                  <SuccessMessage
                    reservationId={decodedLog.args.collateralReservationId.toString()}
                    paymentAmount={`${totalXRP} XRP`}
                    paymentAddress={decodedLog.args.paymentAddress}
                    paymentReference={decodedLog.args.paymentReference}
                  />
                );
                break;
              }
            } catch {
              // This log is not a CollateralReserved event, continue to next log
              console.log('Log is not a CollateralReserved event:', log);
            }
          }
        }

        // Log the transaction hash and block number
        console.log('Transaction successful:', {
          hash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice,
        });
      } catch (error) {
        console.error('Error decoding transaction result:', error);
      }
      reset();
    }
  }, [isReserveSuccess, receipt, reset]);

  async function mint(data: MintXRPFormData) {
    console.log('=== MINT FUNCTION START ===');
    setError(null);
    setSuccess(null);

    // Add a timeout to catch silent failures
    const mintTimeout = setTimeout(() => {
      console.error(
        'Mint function timeout - function took too long to complete'
      );
      setError(
        'Transaction timeout: The mint function took too long to complete. This may indicate a silent failure.'
      );
    }, 60000); // 60 second timeout

    console.log('Mint function called with data:', data);
    console.log('Current state:', {
      assetManagerAddress,
      isConnected,
      settings: !!settings,
      availableAgents: availableAgents.length,
      reserveContract: !!reserveContract,
      writeError: writeError?.message,
    });

    try {
      console.log('Step 1: Validating inputs...');
      if (!assetManagerAddress) {
        throw new Error('AssetManager address not loaded');
      }

      if (!isConnected) {
        throw new Error('Please connect your wallet');
      }

      // Validate that lots is a positive integer
      const lotsNumber = parseInt(data.lots);
      console.log('Lots number parsed:', lotsNumber);
      if (isNaN(lotsNumber) || lotsNumber <= 0) {
        throw new Error('Lots must be a positive integer');
      }

      console.log('Step 2: Getting reservation fee...');
      // Get current reservation fee at transaction time (as BigInt for precision)
      const currentFeeAmount = await getCurrentFee(lotsNumber);
      console.log('Current fee amount (BigInt):', currentFeeAmount.toString());
      console.log(
        'Current fee amount (FLR):',
        Number(currentFeeAmount) / Math.pow(10, 18)
      );

      console.log('Step 3: Finding selected agent...');
      // Get agent fee
      const selectedAgent = availableAgents.find(
        agent => agent.agentVault === data.agentVault
      );
      console.log('Selected agent:', selectedAgent);
      if (!selectedAgent) {
        throw new Error('Selected agent not found');
      }

      console.log('Step 4: Preparing transaction parameters...');
      const executor = '0x0000000000000000000000000000000000000000';

      const agentFeeBIPS = selectedAgent.feeBIPS.toString();
      console.log('Agent fee BIPS:', agentFeeBIPS);

      console.log('Calling reserveCollateral with:', {
        agentVault: data.agentVault,
        lots: lotsNumber,
        agentFeeBIPS: parseInt(agentFeeBIPS),
        reservationFee: currentFeeAmount.toString(),
      });

      console.log('About to call reserveContract with:', {
        address: assetManagerAddress,
        args: [
          data.agentVault,
          BigInt(data.lots),
          BigInt(agentFeeBIPS),
          executor,
        ],
        value: currentFeeAmount, // Use BigInt directly
        valueInFLR: Number(currentFeeAmount) / Math.pow(10, 18),
      });

      // Check if reserveContract is available
      if (!reserveContract) {
        throw new Error('reserveContract function is not available');
      }

      // Check if the contract is properly configured
      if (!assetManagerAddress) {
        throw new Error('AssetManager address is not configured');
      }

      console.log('>> assetManagerAddress:', assetManagerAddress);

      // Call the reserveCollateral function using the generated hook
      console.log('Attempting to call reserveContract with:', {
        address: assetManagerAddress,
        args: [
          data.agentVault,
          BigInt(data.lots),
          BigInt(agentFeeBIPS),
          executor,
        ],
        value: currentFeeAmount.toString(),
      });

      const result = reserveContract({
        address: assetManagerAddress,
        args: [
          data.agentVault as `0x${string}`,
          BigInt(data.lots),
          BigInt(agentFeeBIPS),
          executor as `0x${string}`,
        ],
        value: currentFeeAmount, // Use BigInt directly
      });

      console.log('reserveContract called successfully, result:', result);
    } catch (error) {
      console.error('Error minting XRP:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('execution reverted')) {
          setError(
            'Transaction failed: The contract rejected the transaction. This could be due to insufficient agent capacity, invalid parameters, or network issues.'
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
        } else {
          setError(`Failed to mint: ${error.message}`);
        }
      } else {
        setError(
          `Failed to mint: An unexpected error occurred - ${String(error)}`
        );
      }
    } finally {
      clearTimeout(mintTimeout);
      console.log('=== MINT FUNCTION END ===');
    }
  }

  const isProcessing = isReservePending || isConfirming;
  const isLoading = isLoadingSettings || isLoadingAgentsData || isLoadingFee;

  // Handle write contract errors (generated hook)
  useEffect(() => {
    console.log('WriteError changed:', writeError);
    if (writeError) {
      console.error(
        'Write contract error detected (generated hook):',
        writeError
      );
      console.error('Error details:', {
        name: writeError.name,
        message: writeError.message,
        cause: writeError.cause,
        stack: writeError.stack,
      });

      // Handle specific error types
      if (
        writeError.message.includes('User denied transaction signature') ||
        writeError.message.includes('user rejected')
      ) {
        setError('Transaction was cancelled by the user.');
      } else if (writeError.message.includes('execution reverted')) {
        setError(
          'Transaction failed: The contract rejected the transaction. This could be due to insufficient agent capacity, invalid parameters, or network issues.'
        );
      } else if (writeError.message.includes('insufficient funds')) {
        setError(
          'Insufficient funds to complete the transaction. Please check your wallet balance.'
        );
      } else {
        setError(`Transaction failed: ${writeError.message}`);
      }
    }
  }, [writeError]);

  // Clear error when new transaction starts
  useEffect(() => {
    if (reserveHash) {
      console.log('Transaction hash received:', reserveHash);
      setError(null); // Clear any previous errors when new transaction starts
    }
  }, [reserveHash]);

  // Monitor transaction timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isReservePending && !reserveHash) {
      // If transaction is pending but no hash after 30 seconds, show error
      timeoutId = setTimeout(() => {
        console.error('Transaction timeout: No hash received after 30 seconds');
        setError(
          'Transaction timeout: No transaction hash received. The transaction may have failed silently.'
        );
      }, 30000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isReservePending, reserveHash]);

  // Debug: Monitor write contract state
  useEffect(() => {
    console.log('Write contract state:', {
      isReservePending,
      isConfirming,
      reserveHash,
      writeError,
      isProcessing,
      error,
      assetManagerError,
      feeError,
    });

    // Log when any error state changes
    if (error || writeError || assetManagerError || feeError) {
      console.log('Error state detected:', {
        error,
        writeError: writeError?.message,
        assetManagerError,
        feeError,
      });
    }
  }, [
    isReservePending,
    isConfirming,
    reserveHash,
    writeError,
    isProcessing,
    error,
    assetManagerError,
    feeError,
  ]);

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-blue-900'>
            <Coins className='h-5 w-5 text-blue-600' />
            Mint XRP to FXRP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-blue-700 mb-6'>
            Reserve collateral and mint FXRP tokens by providing XRP to the
            Asset Manager.
          </p>

          <form onSubmit={handleSubmit(mint)} className='space-y-6'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='agentVault' className='text-blue-900'>
                  Agent Vault
                </Label>
                {isLoading ? (
                  <div className='flex items-center space-x-2 p-3 border rounded-md bg-blue-50 border-blue-200'>
                    <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
                    <span className='text-sm text-blue-700'>
                      Loading available agents...
                    </span>
                  </div>
                ) : (
                  <Controller
                    name='agentVault'
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger
                          className={`border-blue-300 focus:ring-blue-500 cursor-pointer transition-all duration-200 ${
                            field.value
                              ? 'h-auto min-h-[140px] p-6'
                              : 'h-12 px-4'
                          }`}
                        >
                          <SelectValue placeholder='Select an agent vault'>
                            {field.value && (
                              <div className='flex flex-col items-start space-y-5 w-full'>
                                {availableAgents.find(
                                  agent => agent.agentVault === field.value
                                ) && (
                                  <>
                                    <div className='w-full space-y-4'>
                                      <div className='flex items-center justify-between'>
                                        <span className='font-bold text-blue-900 text-lg'>
                                          {availableAgents.find(
                                            agent =>
                                              agent.agentVault === field.value
                                          )?.agentName || 'Unknown Agent'}
                                        </span>
                                        <div className='flex gap-2'>
                                          <Badge
                                            variant='secondary'
                                            className='bg-blue-100 text-blue-800 text-sm px-3 py-1.5'
                                          >
                                            Fee:{' '}
                                            {Number(
                                              availableAgents.find(
                                                agent =>
                                                  agent.agentVault ===
                                                  field.value
                                              )?.feeBIPS
                                            ) / 100}
                                            %
                                          </Badge>
                                          <Badge
                                            variant='outline'
                                            className='border-blue-300 text-blue-700 text-sm px-3 py-1.5'
                                          >
                                            Free:{' '}
                                            {availableAgents
                                              .find(
                                                agent =>
                                                  agent.agentVault ===
                                                  field.value
                                              )
                                              ?.freeCollateralLots.toString()}{' '}
                                            lots
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className='bg-blue-50 p-3 rounded-md'>
                                        <span className='font-mono text-sm text-blue-700 break-all leading-relaxed'>
                                          {field.value}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className='max-w-2xl'>
                          {availableAgents.map((agent, index) => (
                            <SelectItem
                              key={index}
                              value={agent.agentVault}
                              className='py-6 cursor-pointer'
                            >
                              <div className='flex flex-col space-y-4 w-full'>
                                <div className='flex items-center justify-between'>
                                  <span className='font-bold text-blue-900 text-lg'>
                                    {agent.agentName || 'Unknown Agent'}
                                  </span>
                                  <div className='flex gap-2'>
                                    <Badge
                                      variant='secondary'
                                      className='bg-blue-100 text-blue-800 text-sm px-3 py-1.5'
                                    >
                                      Fee: {Number(agent.feeBIPS) / 100}%
                                    </Badge>
                                    <Badge
                                      variant='outline'
                                      className='border-blue-300 text-blue-700 text-sm px-3 py-1.5'
                                    >
                                      Free:{' '}
                                      {agent.freeCollateralLots.toString()} lots
                                    </Badge>
                                  </div>
                                </div>
                                <div className='bg-blue-50 p-3 rounded-md'>
                                  <span className='font-mono text-sm text-blue-700 break-all leading-relaxed'>
                                    {agent.agentVault}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {errors.agentVault && (
                  <p className='text-sm text-destructive'>
                    {errors.agentVault.message}
                  </p>
                )}
                {availableAgents.length === 0 && !isLoading && (
                  <p className='text-sm text-blue-600'>
                    No available agents found
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='lots' className='text-blue-900'>
                  Lots
                </Label>
                <Input
                  {...register('lots')}
                  type='number'
                  placeholder='1'
                  step='1'
                  min='1'
                  className='border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                />
                {errors.lots && (
                  <p className='text-sm text-destructive'>
                    {errors.lots.message}
                  </p>
                )}
                <p className='text-xs text-blue-600'>
                  Amount in lots (1 lot = {lotSizeAMG} XRP)
                </p>
                {watchedLots &&
                  watchedLots !== '' &&
                  !isNaN(parseFloat(watchedLots)) && (
                    <div className='mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2'>
                      <p className='text-sm text-blue-800'>
                        <span className='font-semibold'>
                          FXRP to be minted:
                        </span>{' '}
                        {parseFloat(watchedLots) * parseFloat(lotSizeAMG)} FXRP
                      </p>
                      <p className='text-xs text-blue-600'>
                        ({watchedLots} lots × {lotSizeAMG} XRP per lot)
                      </p>
                      {parseFloat(reservationFee) > 0 && (
                        <div className='pt-2 border-t border-blue-200'>
                          <p className='text-sm text-blue-800'>
                            <span className='font-semibold'>
                              Reservation Fee:
                            </span>{' '}
                            {reservationFee} FLR
                          </p>
                          <p className='text-xs text-blue-600'>
                            This fee will be sent with the transaction
                          </p>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            <Button
              type='submit'
              disabled={
                isProcessing ||
                !isConnected ||
                isLoading ||
                !assetManagerAddress ||
                !settings
              }
              className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 cursor-pointer'
            >
              {isProcessing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {isReservePending
                    ? 'Confirming...'
                    : isConfirming
                      ? 'Processing...'
                      : 'Processing...'}
                </>
              ) : (
                <>
                  <Coins className='mr-2 h-4 w-4' />
                  Mint XRP to FXRP
                </>
              )}
            </Button>

            {(error || assetManagerError || writeError || feeError) && (
              <Alert variant='destructive'>
                <AlertDescription>
                  {error ||
                    assetManagerError ||
                    (writeError &&
                      `Transaction Error: ${writeError.message}`) ||
                    (feeError && `Fee Error: ${feeError}`)}
                </AlertDescription>
              </Alert>
            )}

            {/* Debug: Show raw error information if available */}
            {writeError && (
              <div className='mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700'>
                <strong>Debug Info:</strong> {writeError.name}:{' '}
                {writeError.message}
              </div>
            )}

            {success && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800'>
                {success}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
