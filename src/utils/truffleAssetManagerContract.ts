import { ethers } from 'ethers';
import { coston2 } from '@flarenetwork/flare-periphery-contract-artifacts';

// Import Truffle types for better type safety
import type { IAssetManagerInstance } from '../types/truffle-types/flare-periphery-contracts-fassets-test/coston2/IAssetManager';

export class AssetManagerContract {
  private contract: ethers.Contract;
  private provider: ethers.BrowserProvider;
  private signer: ethers.Signer;

  constructor(
    provider: ethers.BrowserProvider,
    signer: ethers.Signer,
    contractAddress: string
  ) {
    this.provider = provider;
    this.signer = signer;
    
    // Use the actual AssetManager ABI from the package
    const assetManagerInfo = coston2.products.AssetManagerFXRP;
    this.contract = new ethers.Contract(contractAddress, assetManagerInfo.abi, signer);
  }

  static async create(
    provider: ethers.BrowserProvider,
    signer: ethers.Signer
  ): Promise<AssetManagerContract> {
    // Get AssetManager contract address
    const assetManagerInfo = coston2.products.AssetManagerFXRP;
    const assetManagerAddressResult = await assetManagerInfo.getAddress(provider);
    
    let assetManagerAddress: string;
    if (typeof assetManagerAddressResult === 'string') {
      assetManagerAddress = assetManagerAddressResult;
    } else if (assetManagerAddressResult && typeof assetManagerAddressResult === 'object' && 'data' in assetManagerAddressResult) {
      assetManagerAddress = (assetManagerAddressResult as { data: string }).data;
    } else {
      throw new Error('Invalid address format returned from getAddress');
    }
    
    return new AssetManagerContract(provider, signer, assetManagerAddress);
  }

  async getSettings(): Promise<Awaited<ReturnType<IAssetManagerInstance['getSettings']>>> {
    return await this.contract.getSettings();
  }

  // Updated to match Truffle interface: redeem(_lots, _redeemerUnderlyingAddressString, _executor)
  async redeem(
    _lots: string, 
    _redeemerUnderlyingAddressString: string,
  ): Promise<unknown> {

    const executor = "0x0000000000000000000000000000000000000000"; // Use zero address
    
    // Call the AssetManager's redeem function using the Truffle interface signature
    return await this.contract.redeem(_lots, _redeemerUnderlyingAddressString, executor);
  }

  // Calculate collateral reservation fee for given lots
  async collateralReservationFee(_lots: string): Promise<bigint> {
    try {
      const fee = await this.contract.collateralReservationFee(_lots);
      return fee;
    } catch (error) {
      console.error('Error calculating collateral reservation fee:', error);
      throw error;
    }
  }

  // Updated to match Truffle interface: reserveCollateral(_agentVault, _lots, _maxMintingFeeBIPS, _executor)
  async reserveCollateral(
    _agentVault: string,
    _lots: string,
    _maxMintingFeeBIPS: string,
  ): Promise<Awaited<ReturnType<IAssetManagerInstance['reserveCollateral']>>> {

    const executor = "0x0000000000000000000000000000000000000000"; // Use zero address

    // Calculate the collateral reservation fee
    const reservationFee = await this.collateralReservationFee(_lots);
    
    console.log('Reserving collateral with:', {
      agentVault: _agentVault,
      lots: _lots,
      maxMintingFeeBIPS: _maxMintingFeeBIPS,
      executor: executor,
      reservationFee: reservationFee.toString()
    });
    
    // Call the AssetManager's reserveCollateral function with the fee value
    return await this.contract.reserveCollateral(_agentVault, _lots, _maxMintingFeeBIPS, executor, {
      value: reservationFee
    });
  }

  // Get agent information including fee
  async getAgentInfo(_agentVault: string): Promise<{
    status: bigint;
    ownerManagementAddress: string;
    ownerWorkAddress: string;
    collateralPool: string;
    collateralPoolToken: string;
    underlyingAddressString: string;
    publiclyAvailable: boolean;
    feeBIPS: bigint;
    poolFeeShareBIPS: bigint;
    vaultCollateralToken: string;
    mintingVaultCollateralRatioBIPS: bigint;
    mintingPoolCollateralRatioBIPS: bigint;
    freeCollateralLots: bigint;
    totalVaultCollateralWei: bigint;
    freeVaultCollateralWei: bigint;
    vaultCollateralRatioBIPS: bigint;
    poolWNatToken: string;
    totalPoolCollateralNATWei: bigint;
    freePoolCollateralNATWei: bigint;
    poolCollateralRatioBIPS: bigint;
    totalAgentPoolTokensWei: bigint;
    announcedVaultCollateralWithdrawalWei: bigint;
    announcedPoolTokensWithdrawalWei: bigint;
    freeAgentPoolTokensWei: bigint;
    mintedUBA: bigint;
    reservedUBA: bigint;
    redeemingUBA: bigint;
    poolRedeemingUBA: bigint;
    dustUBA: bigint;
    liquidationStartTimestamp: bigint;
    maxLiquidationAmountUBA: bigint;
    liquidationPaymentFactorVaultBIPS: bigint;
    liquidationPaymentFactorPoolBIPS: bigint;
    underlyingBalanceUBA: bigint;
    requiredUnderlyingBalanceUBA: bigint;
    freeUnderlyingBalanceUBA: bigint;
    announcedUnderlyingWithdrawalId: bigint;
    buyFAssetByAgentFactorBIPS: bigint;
    poolExitCollateralRatioBIPS: bigint;
    redemptionPoolFeeShareBIPS: bigint;
  }> {
    try {
      const result = await this.contract.getAgentInfo(_agentVault);
      return {
        status: result.status,
        ownerManagementAddress: result.ownerManagementAddress,
        ownerWorkAddress: result.ownerWorkAddress,
        collateralPool: result.collateralPool,
        collateralPoolToken: result.collateralPoolToken,
        underlyingAddressString: result.underlyingAddressString,
        publiclyAvailable: result.publiclyAvailable,
        feeBIPS: result.feeBIPS,
        poolFeeShareBIPS: result.poolFeeShareBIPS,
        vaultCollateralToken: result.vaultCollateralToken,
        mintingVaultCollateralRatioBIPS: result.mintingVaultCollateralRatioBIPS,
        mintingPoolCollateralRatioBIPS: result.mintingPoolCollateralRatioBIPS,
        freeCollateralLots: result.freeCollateralLots,
        totalVaultCollateralWei: result.totalVaultCollateralWei,
        freeVaultCollateralWei: result.freeVaultCollateralWei,
        vaultCollateralRatioBIPS: result.vaultCollateralRatioBIPS,
        poolWNatToken: result.poolWNatToken,
        totalPoolCollateralNATWei: result.totalPoolCollateralNATWei,
        freePoolCollateralNATWei: result.freePoolCollateralNATWei,
        poolCollateralRatioBIPS: result.poolCollateralRatioBIPS,
        totalAgentPoolTokensWei: result.totalAgentPoolTokensWei,
        announcedVaultCollateralWithdrawalWei: result.announcedVaultCollateralWithdrawalWei,
        announcedPoolTokensWithdrawalWei: result.announcedPoolTokensWithdrawalWei,
        freeAgentPoolTokensWei: result.freeAgentPoolTokensWei,
        mintedUBA: result.mintedUBA,
        reservedUBA: result.reservedUBA,
        redeemingUBA: result.redeemingUBA,
        poolRedeemingUBA: result.poolRedeemingUBA,
        dustUBA: result.dustUBA,
        liquidationStartTimestamp: result.liquidationStartTimestamp,
        maxLiquidationAmountUBA: result.maxLiquidationAmountUBA,
        liquidationPaymentFactorVaultBIPS: result.liquidationPaymentFactorVaultBIPS,
        liquidationPaymentFactorPoolBIPS: result.liquidationPaymentFactorPoolBIPS,
        underlyingBalanceUBA: result.underlyingBalanceUBA,
        requiredUnderlyingBalanceUBA: result.requiredUnderlyingBalanceUBA,
        freeUnderlyingBalanceUBA: result.freeUnderlyingBalanceUBA,
        announcedUnderlyingWithdrawalId: result.announcedUnderlyingWithdrawalId,
        buyFAssetByAgentFactorBIPS: result.buyFAssetByAgentFactorBIPS,
        poolExitCollateralRatioBIPS: result.poolExitCollateralRatioBIPS,
        redemptionPoolFeeShareBIPS: result.redemptionPoolFeeShareBIPS
      };
    } catch (error) {
      console.error('Error fetching agent info:', error);
      throw error;
    }
  }

  // Helper method to get available agents (for minting)
  async getAvailableAgentsDetailedList(start: number = 0, end: number = 100): Promise<{
    agents: Array<{
      agentVault: string;
      ownerManagementAddress: string;
      feeBIPS: bigint;
      mintingVaultCollateralRatioBIPS: bigint;
      mintingPoolCollateralRatioBIPS: bigint;
      freeCollateralLots: bigint;
      status: bigint;
    }>;
    totalCount: bigint;
  }> {
    try {
      const result = await this.contract.getAvailableAgentsDetailedList(start, end);
      return {
        agents: result[0].map((agent: unknown) => ({
          agentVault: (agent as { agentVault: string }).agentVault,
          ownerManagementAddress: (agent as { ownerManagementAddress: string }).ownerManagementAddress,
          feeBIPS: (agent as { feeBIPS: bigint }).feeBIPS,
          mintingVaultCollateralRatioBIPS: (agent as { mintingVaultCollateralRatioBIPS: bigint }).mintingVaultCollateralRatioBIPS,
          mintingPoolCollateralRatioBIPS: (agent as { mintingPoolCollateralRatioBIPS: bigint }).mintingPoolCollateralRatioBIPS,
          freeCollateralLots: (agent as { freeCollateralLots: bigint }).freeCollateralLots,
          status: (agent as { status: bigint }).status
        })),
        totalCount: result[1]
      };
    } catch (error) {
      console.error('Error fetching available agents:', error);
      return { agents: [], totalCount: BigInt(0) };
    }
  }

  getContractAddress(): string {
    return this.contract.target as string;
  }

  // Type-safe method signatures based on Truffle types
  getTypedContract(): ethers.Contract & Partial<IAssetManagerInstance> {
    return this.contract as ethers.Contract & Partial<IAssetManagerInstance>;
  }
} 