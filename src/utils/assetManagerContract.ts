import { ethers } from 'ethers';
import { coston2 } from 'flare-periphery-contract-artifacts-test-fassets';

export class AssetManagerContract {
  private contract: ethers.Contract;
  private provider: ethers.BrowserProvider;
  private signer: ethers.Signer;

  constructor(provider: ethers.BrowserProvider, signer: ethers.Signer, contractAddress: string) {
    this.provider = provider;
    this.signer = signer;
    
    // Use the actual AssetManager ABI from the package
    const assetManagerInfo = coston2.products.AssetManagerFXRP;
    this.contract = new ethers.Contract(contractAddress, assetManagerInfo.abi, signer);
  }

  static async create(provider: ethers.BrowserProvider, signer: ethers.Signer): Promise<AssetManagerContract> {
    // Get AssetManager contract address
    const assetManagerInfo = coston2.products.AssetManagerFXRP;
    const assetManagerAddress = await assetManagerInfo.getAddress(provider);
    
    return new AssetManagerContract(provider, signer, assetManagerAddress);
  }

  async getSettings(): Promise<any> {
    return await this.contract.getSettings();
  }

  async mint(amount: string, recipient: string): Promise<ethers.ContractTransactionResponse> {
    // Convert amount to wei (assuming 6 decimals like XRP)
    const amountInWei = ethers.parseUnits(amount, 6);
    
    // Call the AssetManager's mint function using the actual ABI
    // The data parameter can be empty for basic minting
    const data = '0x';
    
    return await this.contract.mint(amountInWei, recipient, data);
  }

  async redeem(amount: string, recipient: string): Promise<ethers.ContractTransactionResponse> {
    // Convert amount to wei (assuming 6 decimals like XRP)
    const amountInWei = ethers.parseUnits(amount, 6);
    
    // Call the AssetManager's redeem function using the actual ABI
    // The data parameter can be empty for basic redemption
    const data = '0x';
    
    return await this.contract.redeem(amountInWei, recipient, data);
  }

  getContractAddress(): string {
    return this.contract.target as string;
  }
} 