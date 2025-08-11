import { ethers } from 'ethers';
import { coston2 } from '@flarenetwork/flare-periphery-contract-artifacts';

// Import Truffle types for better type safety
import type { IAssetManagerInstance } from '../types/truffle-types/flare-periphery-contracts-fassets-test/coston2/IAssetManager';

export class AssetManagerContract {
  private contract: ethers.Contract;

  constructor(
    signer: ethers.Signer,
    contractAddress: string
  ) {
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
    
    return new AssetManagerContract(signer, assetManagerAddress);
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
  ): Promise<Awaited<ReturnType<IAssetManagerInstance['reserveCollateral']>>> {

    const agentInfo = await this.contract.getAgentInfo(_agentVault);
    const agentFeeBIPS = agentInfo.feeBIPS.toString();
    const executor = "0x0000000000000000000000000000000000000000"; // Use zero address

    // Calculate the collateral reservation fee
    const reservationFee = await this.collateralReservationFee(_lots);
    
    console.log('Reserving collateral with:', {
      agentVault: _agentVault,
      lots: _lots,
      maxMintingFeeBIPS: agentFeeBIPS.toString(),
      executor: executor,
      reservationFee: reservationFee.toString()
    });
    
    // Call the AssetManager's reserveCollateral function with the fee value
    return await this.contract.reserveCollateral(_agentVault, _lots, agentFeeBIPS, executor, {
      value: reservationFee
    });
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

  // Get agent fee only
  async getAgentFee(_agentVault: string): Promise<bigint> {
    try {
      const result = await this.contract.getAgentInfo(_agentVault);
      return result.feeBIPS;
    } catch (error) {
      console.error('Error fetching agent fee:', error);
      throw error;
    }
  }

  // Get agent information
  async getAgentInfo(agentVault: string): Promise<{
    agentVault: string;
    ownerManagementAddress: string;
    feeBIPS: bigint;
    mintingVaultCollateralRatioBIPS: bigint;
    mintingPoolCollateralRatioBIPS: bigint;
    freeCollateralLots: bigint;
    status: bigint;
  }> {
    try {
      const result = await this.contract.getAgentInfo(agentVault);
      // Convert BN to bigint and add agentVault
      return {
        agentVault,
        ownerManagementAddress: result.ownerManagementAddress,
        feeBIPS: BigInt(result.feeBIPS.toString()),
        mintingVaultCollateralRatioBIPS: BigInt(result.mintingVaultCollateralRatioBIPS.toString()),
        mintingPoolCollateralRatioBIPS: BigInt(result.mintingPoolCollateralRatioBIPS.toString()),
        freeCollateralLots: BigInt(result.freeCollateralLots.toString()),
        status: BigInt(result.status.toString())
      };
    } catch (error) {
      console.error('Error fetching available agents:', error);
      throw error;
    }
  }

  getContractAddress(): string {
    return this.contract.target as string;
  }

  // Type-safe method signatures based on Truffle types
  getTypedContract(): ethers.Contract {
    return this.contract;
  }
} 