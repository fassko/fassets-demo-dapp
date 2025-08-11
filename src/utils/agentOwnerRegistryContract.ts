import { ethers } from 'ethers';

// Import Truffle types for better type safety
import type { IAgentOwnerRegistryInstance } from '../types/truffle-types/@flarenetwork/flare-periphery-contracts/coston2/IAgentOwnerRegistry';
import { coston2 } from '@flarenetwork/flare-periphery-contract-artifacts';

export class AgentOwnerRegistryContract {
  private contract: ethers.Contract;

  constructor(
    provider: ethers.BrowserProvider,
    signer: ethers.Signer,
    contractAddress: string
  ) {
    const agentOwnerRegistryAbi = coston2.interfaceToAbi("IAgentOwnerRegistry");
    this.contract = new ethers.Contract(contractAddress, agentOwnerRegistryAbi, signer);
  }

  static async create(
    provider: ethers.BrowserProvider,
    signer: ethers.Signer,
    agentOwnerRegistryAddress: string
  ): Promise<AgentOwnerRegistryContract> {
    return new AgentOwnerRegistryContract(provider, signer, agentOwnerRegistryAddress);
  }

  // Get agent name using Truffle interface signature
  async getAgentName(_managementAddress: string): Promise<string> {
    try {
      const name = await this.contract.getAgentName(_managementAddress);
      return name;
    } catch (error) {
      console.error('Error fetching agent name:', error);
      return 'Unknown Agent';
    }
  }

  // Get agent description using Truffle interface signature
  async getAgentDescription(_managementAddress: string): Promise<string> {
    try {
      const description = await this.contract.getAgentDescription(_managementAddress);
      return description;
    } catch (error) {
      console.error('Error fetching agent description:', error);
      return '';
    }
  }

  // Get agent icon URL using Truffle interface signature
  async getAgentIconUrl(_managementAddress: string): Promise<string> {
    try {
      const iconUrl = await this.contract.getAgentIconUrl(_managementAddress);
      return iconUrl;
    } catch (error) {
      console.error('Error fetching agent icon URL:', error);
      return '';
    }
  }

  // Get agent terms of use URL using Truffle interface signature
  async getAgentTermsOfUseUrl(_managementAddress: string): Promise<string> {
    try {
      const termsUrl = await this.contract.getAgentTermsOfUseUrl(_managementAddress);
      return termsUrl;
    } catch (error) {
      console.error('Error fetching agent terms of use URL:', error);
      return '';
    }
  }

  // Get management address from work address using Truffle interface signature
  async getManagementAddress(_workAddress: string): Promise<string> {
    try {
      const managementAddress = await this.contract.getManagementAddress(_workAddress);
      return managementAddress;
    } catch (error) {
      console.error('Error fetching management address:', error);
      throw error;
    }
  }

  // Get work address from management address using Truffle interface signature
  async getWorkAddress(_managementAddress: string): Promise<string> {
    try {
      const workAddress = await this.contract.getWorkAddress(_managementAddress);
      return workAddress;
    } catch (error) {
      console.error('Error fetching work address:', error);
      throw error;
    }
  }

  // Check if address is whitelisted using Truffle interface signature
  async isWhitelisted(_address: string): Promise<boolean> {
    try {
      const isWhitelisted = await this.contract.isWhitelisted(_address);
      return isWhitelisted;
    } catch (error) {
      console.error('Error checking whitelist status:', error);
      return false;
    }
  }

  getContractAddress(): string {
    return this.contract.target as string;
  }

  // Type-safe method signatures based on Truffle types
  getTypedContract(): ethers.Contract & Partial<IAgentOwnerRegistryInstance> {
    return this.contract as ethers.Contract & Partial<IAgentOwnerRegistryInstance>;
  }

  // Get the ABI used by this contract
  getAbi(): any[] {
    return AGENT_OWNER_REGISTRY_ABI;
  }
}
