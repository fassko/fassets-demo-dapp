import { ethers } from 'ethers';

// Import Truffle types for better type safety
import type { IAgentOwnerRegistryInstance } from '../types/truffle-types/@flarenetwork/flare-periphery-contracts/coston2/IAgentOwnerRegistry';
import { coston2 } from '@flarenetwork/flare-periphery-contract-artifacts';

export class AgentOwnerRegistryContract {
  private contract: ethers.Contract;

  constructor(
    signer: ethers.Signer,
    contractAddress: string
  ) {
    const agentOwnerRegistryAbi = coston2.interfaceToAbi("IAgentOwnerRegistry");
    this.contract = new ethers.Contract(contractAddress, agentOwnerRegistryAbi, signer);
  }

  static async create(
    signer: ethers.Signer,
    agentOwnerRegistryAddress: string
  ): Promise<AgentOwnerRegistryContract> {
    return new AgentOwnerRegistryContract(signer, agentOwnerRegistryAddress);
  }

  async getAgentName(_managementAddress: string): Promise<Awaited<ReturnType<IAgentOwnerRegistryInstance['getAgentName']>>> {
    try {
      const name = await this.contract.getAgentName(_managementAddress);
      return name;
    } catch (error) {
      console.error('Error fetching agent name:', error);
      return 'Unknown Agent';
    }
  }

  async getAgentIconUrl(_managementAddress: string): Promise<Awaited<ReturnType<IAgentOwnerRegistryInstance['getAgentIconUrl']>>> {
    try {
      const iconUrl = await this.contract.getAgentIconUrl(_managementAddress);
      return iconUrl;
    } catch (error) {
      console.error('Error fetching agent icon URL:', error);
      return '';
    }
  }
}
