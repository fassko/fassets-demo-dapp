import { ethers } from 'ethers';
import { coston2 } from 'flare-periphery-contract-artifacts-test-fassets';

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
      assetManagerAddress = (assetManagerAddressResult as any).data;
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
  ): Promise<ethers.ContractTransactionResponse> {
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
  ): Promise<ethers.ContractTransactionResponse> {
    // Convert amount to wei (assuming 6 decimals like XRP)
    const lotsInWei = ethers.parseUnits(_lots, 6);
    const maxMintingFeeBIPS = ethers.parseUnits(_maxMintingFeeBIPS, 0); // BIPS is typically in basis points
    
    // Call the AssetManager's reserveCollateral function using the Truffle interface signature
    return await this.contract.reserveCollateral(_agentVault, lotsInWei, maxMintingFeeBIPS, _executor);
  }

  // Helper method to get available agents (for minting)
  async getAvailableAgents(): Promise<any[]> {
    // This would need to be implemented based on the actual contract methods
    // For now, returning empty array as placeholder
    return [];
  }

  getContractAddress(): string {
    return this.contract.target as string;
  }

  // Type-safe method signatures based on Truffle types
  getTypedContract(): ethers.Contract & Partial<IAssetManagerInstance> {
    return this.contract as ethers.Contract & Partial<IAssetManagerInstance>;
  }
} 