import { ethers } from 'ethers';
import { coston2 } from 'flare-periphery-contract-artifacts-test-fassets';
import { IAssetManagerInstance } from '@/types/truffle-types/flare-periphery-contracts-fassets-test/coston2/IAssetManager';

// Import Truffle types for better type safety
// import type { IAssetManagerInstance } from '../types/truffle-types/flare-periphery-contracts-fassets-test/coston2/IAssetManager';

export class AssetManagerContract {
  private contract: ethers.Contract & IAssetManagerInstance;
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
    this.contract = new ethers.Contract(contractAddress, assetManagerInfo.abi, signer) as ethers.Contract & IAssetManagerInstance;
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
    _executor: string
  ): Promise<unknown> {
    // Convert amount to wei (assuming 6 decimals like XRP)
    const lotsInWei = ethers.parseUnits(_lots, 6);
    
    // Call the AssetManager's redeem function using the Truffle interface signature
    return await this.contract.redeem(lotsInWei, _redeemerUnderlyingAddressString, _executor);
  }

  // Updated to match Truffle interface: reserveCollateral(_agentVault, _lots, _maxMintingFeeBIPS, _executor)
  async reserveCollateral(
    _agentVault: string,
    _lots: string,
    _maxMintingFeeBIPS: string,
    _executor: string
  ): Promise<unknown> {
    // Convert lots to BigInt (lots are typically integers)
    const lotsBigInt = BigInt(_lots);
    const maxMintingFeeBIPS = BigInt(_maxMintingFeeBIPS);
    
    // Call the AssetManager's reserveCollateral function using the Truffle interface signature
    return await this.contract.reserveCollateral(_agentVault, lotsBigInt, maxMintingFeeBIPS, _executor);
  }

  // Helper method to get available agents (for minting)
  async getAvailableAgents(): Promise<unknown[]> {
    // This would need to be implemented based on the actual contract methods
    // For now, returning empty array as placeholder
    return [];
  }

  // Get detailed list of available agents
  async getAvailableAgentsDetailedList(): Promise<{
    agents: Array<{
      agentVault: string;
      ownerManagementAddress: string;
      feeBIPS: bigint;
      mintingVaultCollateralRatioBIPS: bigint;
      mintingPoolCollateralRatioBIPS: bigint;
      freeCollateralLots: bigint;
      status: bigint;
    }>;
  }> {
    try {
      // Get all available agents by using a large range
      const result = await this.contract.getAvailableAgentsDetailedList(0, 1000);
      // Convert BN to bigint and restructure the result
      const agents = result[0].map((agent: {
        agentVault: string;
        ownerManagementAddress: string;
        feeBIPS: { toString(): string };
        mintingVaultCollateralRatioBIPS: { toString(): string };
        mintingPoolCollateralRatioBIPS: { toString(): string };
        freeCollateralLots: { toString(): string };
        status: { toString(): string };
      }) => ({
        agentVault: agent.agentVault,
        ownerManagementAddress: agent.ownerManagementAddress,
        feeBIPS: BigInt(agent.feeBIPS.toString()),
        mintingVaultCollateralRatioBIPS: BigInt(agent.mintingVaultCollateralRatioBIPS.toString()),
        mintingPoolCollateralRatioBIPS: BigInt(agent.mintingPoolCollateralRatioBIPS.toString()),
        freeCollateralLots: BigInt(agent.freeCollateralLots.toString()),
        status: BigInt(agent.status.toString())
      }));
      return { agents };
    } catch (error) {
      console.error('Error fetching available agents detailed list:', error);
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
      console.error('Error fetching agent info:', error);
      throw error;
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