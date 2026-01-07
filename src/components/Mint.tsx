'use client';

import { useEffect, useState } from 'react';

import { Coins, ExternalLink, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { Controller, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import {
  useChainId,
  useChains,
  useConnections,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';

import { createPublicClient, decodeEventLog, http } from 'viem';

import { z } from 'zod';

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
import { useAssetManager } from '@/hooks/useAssetManager';
import { getAgentOwnerRegistryAbi, getAssetManagerAbi } from '@/lib/abiUtils';
import { getChainById } from '@/lib/chainUtils';
import { calculateReservationFee, weiToFLR } from '@/lib/feeUtils';

// Form data types
const MintXRPFormDataSchema = z.object({
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

type MintXRPFormData = z.infer<typeof MintXRPFormDataSchema>;

// Reservation fee hook
function useReservationFee(
  assetManagerAddress: string | undefined,
  lots: string,
  agentVault: string,
  chainId: number
) {
  const [reservationFee, setReservationFee] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate reservation fee when lots or agent vault changes
  useEffect(() => {
    const calculateFee = async () => {
      if (assetManagerAddress && lots && agentVault && !isNaN(parseInt(lots))) {
        setIsLoading(true);
        setError(null);

        try {
          const feeWei = await calculateReservationFee(
            assetManagerAddress,
            lots,
            chainId
          );
          const feeInFLR = weiToFLR(feeWei).toString();
          setReservationFee(feeInFLR);
        } catch (error) {
          console.error('Error calculating reservation fee:', error);
          setReservationFee('0');
          setError('Failed to calculate reservation fee');
        } finally {
          setIsLoading(false);
        }
      } else {
        setReservationFee('0');
        setError(null);
      }
    };

    calculateFee();
  }, [assetManagerAddress, lots, agentVault, chainId]);

  // Function to get current fee at transaction time (returns BigInt for precision)
  // Fee can change at transaction time
  const getCurrentFee = async (lotsNumber: number): Promise<bigint> => {
    if (!assetManagerAddress) {
      throw new Error('AssetManager address not loaded');
    }
    return calculateReservationFee(
      assetManagerAddress,
      lotsNumber.toString(),
      chainId
    );
  };

  // Function to get current fee as number for display purposes
  const getCurrentFeeAsNumber = async (lotsNumber: number): Promise<number> => {
    const feeWei = await getCurrentFee(lotsNumber);
    return weiToFLR(feeWei);
  };

  return {
    reservationFee,
    isLoading,
    error,
    getCurrentFee,
    getCurrentFeeAsNumber,
  };
}

// Reserve collateral for FXRP minting
// https://dev.flare.network/fassets/developer-guides/fassets-mint
// https://dev.flare.network/fassets/reference/IAssetManager#reservecollateral

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
      agentDescription?: string;
      agentIconUrl?: string;
    }>
  >([]);

  const [lotSizeAMG, setLotSizeAMG] = useState<string>('0');
  const chainId = useChainId();
  const {
    assetManagerAddress,
    settings,
    isLoading: isLoadingSettings,
    error: assetManagerError,
  } = useAssetManager();
  const connections = useConnections();
  const chains = useChains();
  const isConnected = connections.length > 0;
  const chain = chains.find(c => c.id === connections[0]?.chainId);

  // Form handling
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
    watchedAgentVault,
    chainId
  );

  // Read available agents hook
  const { data: availableAgentsData, isLoading: isLoadingAgentsData } =
    useReadContract({
      address: assetManagerAddress!,
      // Use the IAssetManager ABI to read the available agents
      abi: getAssetManagerAbi(chainId),
      // Use the getAvailableAgentsDetailedList function to get the available agents
      // https://dev.flare.network/fassets/reference/IAssetManager/#getAvailableAgentsDetailedList
      functionName: 'getAvailableAgentsDetailedList',
      query: {
        enabled: !!assetManagerAddress,
      },
      // List agents from index 0 to 100
      args: [BigInt(0), BigInt(100)],
    });

  // Write contract for reserveCollateral function using default wagmi hook
  // https://dev.flare.network/fassets/reference/IAssetManager#reservecollateral
  const {
    data: reserveHash,
    writeContract: reserveCollateral,
    isPending: isReservePending,
    error: writeError,
  } = useWriteContract();

  // Wait for collateral reservation transaction receipt
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

      setError(
        `Transaction receipt failed: ${receiptError instanceof Error ? receiptError.message : String(receiptError)}`
      );
    }
  }, [receiptError]);

  // Process settings at startup
  useEffect(() => {
    if (settings) {
      // https://dev.flare.network/fassets/developer-guides/fassets-settings-solidity
      // Get the lot size from the settings
      const lotSizeRaw = settings.lotSizeAMG.toString();
      // Get the asset decimals from the settings
      const decimals = Number(settings.assetDecimals);
      // Convert the lot size to a human readable format
      const lotSizeHumanReadable = (
        Number(lotSizeRaw) / Math.pow(10, decimals)
      ).toFixed(decimals);
      setLotSizeAMG(lotSizeHumanReadable);
    }
  }, [settings]);

  // Process available agents at startup
  useEffect(() => {
    const fetchAgentsWithNames = async () => {
      if (availableAgentsData && settings) {
        const agents = availableAgentsData[0]; // First element is the agents array

        // Filter agents with available lots
        const availableAgentsWithCollateral = agents.filter(
          agent => agent.freeCollateralLots > BigInt(0)
        );

        // Fetch agent names using manual contract calls
        const agentsWithNames = await Promise.all(
          availableAgentsWithCollateral.map(async agent => {
            try {
              // Create a contract instance for manual calls
              // Use the current connected chain or fall back to Flare mainnet
              const currentChain = chain || getChainById(14);
              if (!currentChain) {
                throw new Error('Unable to determine chain');
              }

              const client = createPublicClient({
                chain: currentChain,
                transport: http(),
              });

              // Get agent details from AgentOwnerRegistry contract
              const [agentName, agentDescription, agentIconUrl] =
                await Promise.all([
                  // Get agent name
                  // https://dev.flare.network/fassets/reference/IAgentOwnerRegistry#getagentname
                  client.readContract({
                    address: settings.agentOwnerRegistry as `0x${string}`,
                    abi: getAgentOwnerRegistryAbi(chainId),
                    functionName: 'getAgentName',
                    args: [agent.ownerManagementAddress],
                  }),
                  // Get agent description
                  // https://dev.flare.network/fassets/reference/IAgentOwnerRegistry#getagentdescription
                  client.readContract({
                    address: settings.agentOwnerRegistry as `0x${string}`,
                    abi: getAgentOwnerRegistryAbi(chainId),
                    functionName: 'getAgentDescription',
                    args: [agent.ownerManagementAddress],
                  }),
                  // Get agent icon URL
                  // https://dev.flare.network/fassets/reference/IAgentOwnerRegistry#getagenticonurl
                  client.readContract({
                    address: settings.agentOwnerRegistry as `0x${string}`,
                    abi: getAgentOwnerRegistryAbi(chainId),
                    functionName: 'getAgentIconUrl',
                    args: [agent.ownerManagementAddress],
                  }),
                ]);

              return {
                ...agent,
                agentVault: agent.agentVault as string,
                ownerManagementAddress: agent.ownerManagementAddress as string,
                status: BigInt(agent.status),
                agentName: (agentName as string) || 'Unknown Agent',
                agentDescription: (agentDescription as string) || '',
                agentIconUrl: (agentIconUrl as string) || '',
              };
            } catch (error) {
              console.error(
                `Error fetching details for agent ${agent.agentVault}:`,
                error
              );
              return {
                ...agent,
                agentVault: agent.agentVault as string,
                ownerManagementAddress: agent.ownerManagementAddress as string,
                status: BigInt(agent.status),
                agentName: 'Unknown Agent',
                agentDescription: '',
                agentIconUrl: '',
              };
            }
          })
        );

        setAvailableAgents(agentsWithNames);
      }
    };

    fetchAgentsWithNames();
  }, [availableAgentsData, settings, chain, chainId]);

  // Handle successful reservation
  useEffect(() => {
    if (isReserveSuccess && receipt) {
      console.log('Transaction receipt:', receipt);

      // Try to decode the CollateralReserved event from the transaction logs
      // https://dev.flare.network/fassets/reference/IAssetManagerEvents#collateralreserved
      try {
        if (receipt.logs && receipt.logs.length > 0) {
          console.log('Transaction logs:', receipt.logs);

          // Look for CollateralReserved event
          for (const log of receipt.logs) {
            try {
              // Try to decode the log as a CollateralReserved event
              const decodedLog = decodeEventLog({
                abi: getAssetManagerAbi(chainId),
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

                // Show the success message
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
  }, [isReserveSuccess, receipt, reset, chainId]);

  async function mint(data: MintXRPFormData) {
    setError(null);
    setSuccess(null);

    console.log('Mint function called with data:', data);

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
      // Not using the executor in this demo
      // That means we use zero address
      const executor = '0x0000000000000000000000000000000000000000';

      // Get agent fee
      // https://dev.flare.network/fassets/reference/IAssetManager/#getavailableagentsdetailedlist
      // https://dev.flare.network/fassets/developer-guides/fassets-mint/
      const agentFeeBIPS = selectedAgent.feeBIPS.toString();
      console.log('Agent fee BIPS:', agentFeeBIPS);

      console.log('Calling reserveCollateral with:', {
        address: assetManagerAddress,
        agentVault: data.agentVault,
        lots: lotsNumber,
        agentFeeBIPS: parseInt(agentFeeBIPS),
        reservationFee: currentFeeAmount.toString(),
        reservationFeeFLR: Number(currentFeeAmount) / Math.pow(10, 18),
        args: [
          data.agentVault,
          BigInt(data.lots),
          BigInt(agentFeeBIPS),
          executor,
        ],
        value: currentFeeAmount,
      });

      // Check if reserveCollateral function is available
      if (!reserveCollateral) {
        throw new Error('reserveCollateral function is not available');
      }

      // Check if the asset manager contract is properly configured
      if (!assetManagerAddress) {
        throw new Error('AssetManager address is not configured');
      }

      console.log('>> assetManagerAddress:', assetManagerAddress);

      // Call the reserveCollateral function using the hook
      // https://dev.flare.network/fassets/reference/IAssetManager#reservecollateral
      const result = reserveCollateral({
        // Use the asset manager address
        address: assetManagerAddress as `0x${string}`,
        // Use the appropriate ABI for the chain
        abi: getAssetManagerAbi(chainId),
        functionName: 'reserveCollateral',
        // Pass the parameters to the reserveCollateral function
        args: [
          // Agent vault address
          data.agentVault as `0x${string}`,
          // Lots
          BigInt(data.lots),
          // Agent fee in BIPS
          BigInt(agentFeeBIPS),
          // Executor is zero address
          executor as `0x${string}`,
        ],
        // Send the fee in native chain token
        value: currentFeeAmount,
      });

      console.log('reserveCollateral called successfully, result:', result);
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
      console.log('=== MINT FUNCTION END ===');
    }
  }

  const isProcessing = isReservePending || isConfirming;
  const isLoading = isLoadingSettings || isLoadingAgentsData || isLoadingFee;

  // Handle write contract errors (hook)
  useEffect(() => {
    console.log('WriteError changed:', writeError);
    if (writeError) {
      console.error('Write contract error detected (hook):', writeError);
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

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <CardTitle className='flex items-center gap-2 text-blue-900'>
              <Coins className='h-5 w-5 text-blue-600' />
              Mint XRP to FXRP
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className='text-blue-700 mb-6'>
            Reserve collateral to mint FXRP.{' '}
            <a
              href='https://dev.flare.network/fassets/minting'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline'
            >
              Learn more
              <ExternalLink className='h-3 w-3' />
            </a>
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
                                {(() => {
                                  const selectedAgent = availableAgents.find(
                                    agent => agent.agentVault === field.value
                                  );
                                  return (
                                    selectedAgent && (
                                      <>
                                        <div className='w-full space-y-4'>
                                          <div className='flex items-center justify-between gap-6'>
                                            <div className='flex items-center gap-3'>
                                              {selectedAgent.agentIconUrl && (
                                                <div className='relative w-10 h-10 rounded-full border-2 border-blue-200 overflow-hidden shrink-0'>
                                                  <Image
                                                    src={
                                                      selectedAgent.agentIconUrl
                                                    }
                                                    alt={
                                                      selectedAgent.agentName ||
                                                      'Agent'
                                                    }
                                                    fill
                                                    className='object-cover'
                                                    unoptimized
                                                  />
                                                </div>
                                              )}
                                              <span className='font-bold text-blue-900 text-lg'>
                                                {selectedAgent.agentName ||
                                                  'Unknown Agent'}
                                              </span>
                                            </div>
                                            <div className='flex gap-2 shrink-0'>
                                              <Badge
                                                variant='secondary'
                                                className='bg-blue-100 text-blue-800 text-sm px-3 py-1.5'
                                              >
                                                Fee:{' '}
                                                {Number(selectedAgent.feeBIPS) /
                                                  100}
                                                %
                                              </Badge>
                                              <Badge
                                                variant='outline'
                                                className='border-blue-300 text-blue-700 text-sm px-3 py-1.5'
                                              >
                                                Free:{' '}
                                                {selectedAgent.freeCollateralLots.toString()}{' '}
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
                                    )
                                  );
                                })()}
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
                                <div className='flex items-center justify-between gap-6'>
                                  <div className='flex items-center gap-3'>
                                    {agent.agentIconUrl && (
                                      <div className='relative w-10 h-10 rounded-full border-2 border-blue-200 overflow-hidden shrink-0'>
                                        <Image
                                          src={agent.agentIconUrl}
                                          alt={agent.agentName || 'Agent'}
                                          fill
                                          className='object-cover'
                                          unoptimized
                                        />
                                      </div>
                                    )}
                                    <span className='font-bold text-blue-900 text-lg'>
                                      {agent.agentName || 'Unknown Agent'}
                                    </span>
                                  </div>
                                  <div className='flex gap-2 shrink-0'>
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
