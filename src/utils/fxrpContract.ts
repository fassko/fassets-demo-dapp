import { ethers } from 'ethers';
import { coston2 } from 'flare-periphery-contract-artifacts-test-fassets';
import { ERC20_ABI } from './erc20Types';

export class FXRPContract {
  private contract: ethers.Contract;
  
  constructor(provider: ethers.BrowserProvider, signer: ethers.Signer, contractAddress: string) {
    this.contract = new ethers.Contract(contractAddress, ERC20_ABI, signer);
  }

  static async create(provider: ethers.BrowserProvider, signer: ethers.Signer): Promise<FXRPContract> {
    // Get AssetManager contract address
    const assetManagerInfo = coston2.products.AssetManagerFXRP;
    const assetManagerAddress = await assetManagerInfo.getAddress(provider);
    
    // Create AssetManager contract instance
    const assetManagerContract = new ethers.Contract(
      assetManagerAddress,
      assetManagerInfo.abi,
      provider
    );
    
    // Get FXRP contract address from AssetManager settings
    const settings = await assetManagerContract.getSettings();
    const fxrpAddress = settings.fAsset; // This should be the FXRP contract address
    
    return new FXRPContract(provider, signer, fxrpAddress);
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.contract.balanceOf(address);
    const decimals = await this.contract.decimals();
    return ethers.formatUnits(balance, decimals);
  }

  async transfer(to: string, amount: string) {
    const decimals = await this.contract.decimals();
    const amountInWei = ethers.parseUnits(amount, decimals);
    return await this.contract.transfer(to, amountInWei);
  }
} 