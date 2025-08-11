'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AssetManagerContract } from '@/utils/assetManagerContract';
import { AgentOwnerRegistryContract } from '@/utils/agentOwnerRegistryContract';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Coins, Loader2 } from "lucide-react";

const MintXRPFormDataSchema = z.object({
  agentVault: z.string().min(1, 'Agent vault address is required'),
  lots: z.string()
    .min(1, 'Lots amount is required')
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Lots must be a positive number')
    .refine(val => Number.isInteger(parseFloat(val)), 'Lots must be a whole number (no decimals)')
});

type MintXRPFormData = z.infer<typeof MintXRPFormDataSchema>;

export default function MintXRP() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assetManagerContract, setAssetManagerContract] = useState<AssetManagerContract | null>(null);
  const [agentOwnerRegistryContract, setAgentOwnerRegistryContract] = useState<AgentOwnerRegistryContract | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Array<{
    agentVault: string;
    ownerManagementAddress: string;
    feeBIPS: bigint;
    mintingVaultCollateralRatioBIPS: bigint;
    mintingPoolCollateralRatioBIPS: bigint;
    freeCollateralLots: bigint;
    status: bigint;
    agentName?: string;
  }>>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [lotSizeAMG, setLotSizeAMG] = useState<string>('0');
  const [reservationFee, setReservationFee] = useState<string>('0');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch
  } = useForm<MintXRPFormData>({
    resolver: zodResolver(MintXRPFormDataSchema),
    defaultValues: {
      agentVault: '',
      lots: ''
    }
  });

  const watchedLots = watch('lots');
  const watchedAgentVault = watch('agentVault');

  // Calculate reservation fee when lots or agent vault changes
  useEffect(() => {
    const calculateReservationFee = async () => {
      if (assetManagerContract && watchedLots && watchedAgentVault && !isNaN(parseInt(watchedLots))) {
        try {
          const fee = await assetManagerContract.collateralReservationFee(watchedLots);
          const feeInFLR = ethers.formatEther(fee);
          setReservationFee(feeInFLR);
        } catch (error) {
          console.error('Error calculating reservation fee:', error);
          setReservationFee('0');
        }
      } else {
        setReservationFee('0');
      }
    };

    calculateReservationFee();
  }, [assetManagerContract, watchedLots, watchedAgentVault]);

  const initializeConnections = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const assetManagerContractInstance = await AssetManagerContract.create(provider, signer);
        setAssetManagerContract(assetManagerContractInstance);
        
        // Get agent owner registry address from settings
        const settings = await assetManagerContractInstance.getSettings();
        const agentOwnerRegistryAddress = settings.agentOwnerRegistry;
        
        // Initialize agent owner registry contract
        const agentOwnerRegistryInstance = await AgentOwnerRegistryContract.create(

          signer, 
          agentOwnerRegistryAddress
        );
        setAgentOwnerRegistryContract(agentOwnerRegistryInstance);
        
        // Fetch available agents and settings after contract is initialized
        await Promise.all([
          fetchAvailableAgents(assetManagerContractInstance, agentOwnerRegistryInstance),
          fetchAssetManagerSettings(assetManagerContractInstance)
        ]);
      }
    } catch (error) {
      console.error('Error initializing connections:', error);
    }
  }, []);

  useEffect(() => {
    initializeConnections();
  }, [initializeConnections]);

  async function fetchAssetManagerSettings(contract: AssetManagerContract) {
    try {
      const settings = await contract.getSettings();
      
      // Get lot size and asset decimals
      const lotSizeRaw = typeof settings.lotSizeAMG === 'bigint'
        ? settings.lotSizeAMG.toString()
        : settings.lotSizeAMG.toString();
      
      const decimals = typeof settings.assetDecimals === 'bigint'
        ? Number(settings.assetDecimals)
        : Number(settings.assetDecimals);
      
      // Convert lot size to human readable format
      const lotSizeHumanReadable = ethers.formatUnits(lotSizeRaw, decimals);
      
      setLotSizeAMG(lotSizeHumanReadable);
      console.log('Lot size AMG (human readable):', lotSizeHumanReadable);
      console.log('Asset decimals:', decimals);
    } catch (error) {
      console.error('Error fetching AssetManager settings:', error);
      setError('Failed to fetch AssetManager settings');
    }
  }

  async function fetchAvailableAgents(contract: AssetManagerContract, agentOwnerRegistry: AgentOwnerRegistryContract) {
    setIsLoadingAgents(true);
    try {
      const result = await contract.getAvailableAgentsDetailedList();
      // Filter agents with more than 0 free collateral lots
      const availableAgentsWithCollateral = result.agents.filter(agent => 
        agent.freeCollateralLots > BigInt(0)
      );
      
      // Fetch agent names for each agent
      const agentsWithNames = await Promise.all(
        availableAgentsWithCollateral.map(async (agent) => {
          try {
            const agentName = await agentOwnerRegistry.getAgentName(agent.ownerManagementAddress);
            return {
              ...agent,
              agentName
            };
          } catch (error) {
            console.error(`Error fetching name for agent ${agent.agentVault}:`, error);
            return {
              ...agent,
              agentName: 'Unknown Agent'
            };
          }
        })
      );
      
      setAvailableAgents(agentsWithNames);
      console.log('Available agents with names:', agentsWithNames);
    } catch (error) {
      console.error('Error fetching available agents:', error);
      setError('Failed to fetch available agents');
    } finally {
      setIsLoadingAgents(false);
    }
  }

  async function mintXRP(data: MintXRPFormData) {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      if (!assetManagerContract) { 
        throw new Error('AssetManager contract not initialized'); 
      }

      // Fetch agent info to get the fee
      const agentInfo = await assetManagerContract.getAgentInfo(data.agentVault);
      const agentFeeBIPS = agentInfo.feeBIPS.toString();

      console.log('Minting XRP with parameters:', {
        agentVault: data.agentVault,
        lots: data.lots,
        lotsType: typeof data.lots,
        agentFeeBIPS,
        agentFeeBIPSType: typeof agentFeeBIPS,
      });

      // Validate that lots is a positive integer
      const lotsNumber = parseInt(data.lots);
      if (isNaN(lotsNumber) || lotsNumber <= 0) {
        throw new Error('Lots must be a positive integer');
      }

      // Validate reservation fee
      const feeAmount = parseFloat(reservationFee);
      if (isNaN(feeAmount) || feeAmount <= 0) {
        throw new Error('Invalid reservation fee calculated');
      }

      console.log('Calling reserveCollateral with:', {
        agentVault: data.agentVault,
        lots: lotsNumber,
        agentFeeBIPS: parseInt(agentFeeBIPS)
      });

      await assetManagerContract.reserveCollateral(
        data.agentVault,
        data.lots,
      );

      setSuccess(`Successfully reserved collateral for ${data.lots} lots with agent fee ${Number(agentFeeBIPS) / 100}% and reservation fee ${reservationFee} FLR`);
      reset();
    } catch (error) {
      console.error('Error minting XRP:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('execution reverted')) {
          setError('Transaction failed: The contract rejected the transaction. This could be due to insufficient agent capacity, invalid parameters, or network issues.');
        } else if (error.message.includes('insufficient funds')) {
          setError('Insufficient funds to complete the transaction. Please check your wallet balance.');
        } else if (error.message.includes('user rejected')) {
          setError('Transaction was cancelled by the user.');
        } else {
          setError(`Failed to mint XRP: ${error.message}`);
        }
      } else {
        setError('Failed to mint XRP: An unexpected error occurred');
      }
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Coins className="h-5 w-5 text-blue-600" />
            Mint XRP to FXRP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 mb-6">
            Reserve collateral and mint FXRP tokens by providing XRP to the Asset Manager.
          </p>

          <form onSubmit={handleSubmit(mintXRP)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentVault" className="text-blue-900">Agent Vault</Label>
                {isLoadingAgents ? (
                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-blue-50 border-blue-200">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-700">Loading available agents...</span>
                  </div>
                ) : (
                  <Controller
                    name="agentVault"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={`border-blue-300 focus:ring-blue-500 cursor-pointer transition-all duration-200 ${
                          field.value 
                            ? 'h-auto min-h-[140px] p-6' 
                            : 'h-12 px-4'
                        }`}>
                          <SelectValue placeholder="Select an agent vault">
                            {field.value && (
                              <div className="flex flex-col items-start space-y-5 w-full">
                                {availableAgents.find(agent => agent.agentVault === field.value) && (
                                  <>
                                    <div className="w-full space-y-4">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-blue-900 text-lg">
                                          {availableAgents.find(agent => agent.agentVault === field.value)?.agentName || 'Unknown Agent'}
                                        </span>
                                        <div className="flex gap-2">
                                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-sm px-3 py-1.5">
                                            Fee: {Number(availableAgents.find(agent => agent.agentVault === field.value)?.feeBIPS) / 100}%
                                          </Badge>
                                          <Badge variant="outline" className="border-blue-300 text-blue-700 text-sm px-3 py-1.5">
                                            Free: {availableAgents.find(agent => agent.agentVault === field.value)?.freeCollateralLots.toString()} lots
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="bg-blue-50 p-3 rounded-md">
                                        <span className="font-mono text-sm text-blue-700 break-all leading-relaxed">
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
                        <SelectContent className="max-w-2xl">
                          {availableAgents.map((agent, index) => (
                            <SelectItem key={index} value={agent.agentVault} className="py-6 cursor-pointer">
                              <div className="flex flex-col space-y-4 w-full">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-blue-900 text-lg">
                                    {agent.agentName || 'Unknown Agent'}
                                  </span>
                                  <div className="flex gap-2">
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-sm px-3 py-1.5">
                                      Fee: {Number(agent.feeBIPS) / 100}%
                                    </Badge>
                                    <Badge variant="outline" className="border-blue-300 text-blue-700 text-sm px-3 py-1.5">
                                      Free: {agent.freeCollateralLots.toString()} lots
                                    </Badge>
                                  </div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-md">
                                  <span className="font-mono text-sm text-blue-700 break-all leading-relaxed">
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
                  <p className="text-sm text-destructive">{errors.agentVault.message}</p>
                )}
                {availableAgents.length === 0 && !isLoadingAgents && (
                  <p className="text-sm text-blue-600">No available agents found</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lots" className="text-blue-900">Lots Amount</Label>
                <Input
                  {...register('lots')}
                  type="number"
                  placeholder="1"
                  step="1"
                  min="1"
                  className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.lots && (
                  <p className="text-sm text-destructive">{errors.lots.message}</p>
                )}
                <p className="text-xs text-blue-600">
                  Amount in lots (1 lot = {lotSizeAMG} XRP)
                </p>
                {watchedLots && watchedLots !== '' && !isNaN(parseFloat(watchedLots)) && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">FXRP to be minted:</span> {parseFloat(watchedLots) * parseFloat(lotSizeAMG)} FXRP
                    </p>
                    <p className="text-xs text-blue-600">
                      ({watchedLots} lots × {lotSizeAMG} XRP per lot)
                    </p>
                    {parseFloat(reservationFee) > 0 && (
                      <div className="pt-2 border-t border-blue-200">
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">Reservation Fee:</span> {reservationFee} FLR
                        </p>
                        <p className="text-xs text-blue-600">
                          This fee will be sent with the transaction
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  Mint XRP to FXRP
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
