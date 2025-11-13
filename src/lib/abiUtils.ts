// Utility functions for selecting network-specific ABIs and hooks
// Maps chain IDs to the appropriate ABIs and hooks from test-periphery-artifacts-wagmi-types

import { ftsoV2InterfaceAbi as costonFtsoV2InterfaceAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston/FtsoV2Interface';
import { iAgentOwnerRegistryAbi as costonIAgentOwnerRegistryAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston/IAgentOwnerRegistry';
import {
  iAssetManagerAbi as costonIAssetManagerAbi,
  useWriteIAssetManager as costonUseWriteIAssetManager,
} from 'test-periphery-artifacts-wagmi-types/contracts/coston/IAssetManager';
import { useWriteIFdcHub as costonUseWriteIFdcHub } from 'test-periphery-artifacts-wagmi-types/contracts/coston/IFdcHub';
import { iFdcRequestFeeConfigurationsAbi as costonIFdcRequestFeeConfigurationsAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston/IFdcRequestFeeConfigurations';
import { iFlareSystemsManagerAbi as costonIFlareSystemsManagerAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston/IFlareSystemsManager';
import { iPaymentVerificationAbi as costonIPaymentVerificationAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston/IPaymentVerification';
import { iReferencedPaymentNonexistenceVerificationAbi as costonIReferencedPaymentNonexistenceVerificationAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston/IReferencedPaymentNonexistenceVerification';
import { ftsoV2InterfaceAbi as coston2FtsoV2InterfaceAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston2/FtsoV2Interface';
import { iAgentOwnerRegistryAbi as coston2IAgentOwnerRegistryAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston2/IAgentOwnerRegistry';
import {
  iAssetManagerAbi as coston2IAssetManagerAbi,
  useWriteIAssetManager as coston2UseWriteIAssetManager,
} from 'test-periphery-artifacts-wagmi-types/contracts/coston2/IAssetManager';
import { useWriteIFdcHub as coston2UseWriteIFdcHub } from 'test-periphery-artifacts-wagmi-types/contracts/coston2/IFdcHub';
import { iFdcRequestFeeConfigurationsAbi as coston2IFdcRequestFeeConfigurationsAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston2/IFdcRequestFeeConfigurations';
import { iFlareSystemsManagerAbi as coston2IFlareSystemsManagerAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston2/IFlareSystemsManager';
import { iPaymentVerificationAbi as coston2IPaymentVerificationAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston2/IPaymentVerification';
import { iReferencedPaymentNonexistenceVerificationAbi as coston2IReferencedPaymentNonexistenceVerificationAbi } from 'test-periphery-artifacts-wagmi-types/contracts/coston2/IReferencedPaymentNonexistenceVerification';
import { ftsoV2InterfaceAbi as flareFtsoV2InterfaceAbi } from 'test-periphery-artifacts-wagmi-types/contracts/flare/FtsoV2Interface';
import { iAgentOwnerRegistryAbi as flareIAgentOwnerRegistryAbi } from 'test-periphery-artifacts-wagmi-types/contracts/flare/IAgentOwnerRegistry';
import {
  iAssetManagerAbi as flareIAssetManagerAbi,
  useWriteIAssetManager as flareUseWriteIAssetManager,
} from 'test-periphery-artifacts-wagmi-types/contracts/flare/IAssetManager';
import { useWriteIFdcHub as flareUseWriteIFdcHub } from 'test-periphery-artifacts-wagmi-types/contracts/flare/IFdcHub';
import { iFdcRequestFeeConfigurationsAbi as flareIFdcRequestFeeConfigurationsAbi } from 'test-periphery-artifacts-wagmi-types/contracts/flare/IFdcRequestFeeConfigurations';
import { iFlareSystemsManagerAbi as flareIFlareSystemsManagerAbi } from 'test-periphery-artifacts-wagmi-types/contracts/flare/IFlareSystemsManager';
import { iPaymentVerificationAbi as flareIPaymentVerificationAbi } from 'test-periphery-artifacts-wagmi-types/contracts/flare/IPaymentVerification';
import { iReferencedPaymentNonexistenceVerificationAbi as flareIReferencedPaymentNonexistenceVerificationAbi } from 'test-periphery-artifacts-wagmi-types/contracts/flare/IReferencedPaymentNonexistenceVerification';
import { ftsoV2InterfaceAbi as songbirdFtsoV2InterfaceAbi } from 'test-periphery-artifacts-wagmi-types/contracts/songbird/FtsoV2Interface';
import { iAgentOwnerRegistryAbi as songbirdIAgentOwnerRegistryAbi } from 'test-periphery-artifacts-wagmi-types/contracts/songbird/IAgentOwnerRegistry';
import {
  iAssetManagerAbi as songbirdIAssetManagerAbi,
  useWriteIAssetManager as songbirdUseWriteIAssetManager,
} from 'test-periphery-artifacts-wagmi-types/contracts/songbird/IAssetManager';
import { useWriteIFdcHub as songbirdUseWriteIFdcHub } from 'test-periphery-artifacts-wagmi-types/contracts/songbird/IFdcHub';
import { iFdcRequestFeeConfigurationsAbi as songbirdIFdcRequestFeeConfigurationsAbi } from 'test-periphery-artifacts-wagmi-types/contracts/songbird/IFdcRequestFeeConfigurations';
import { iFlareSystemsManagerAbi as songbirdIFlareSystemsManagerAbi } from 'test-periphery-artifacts-wagmi-types/contracts/songbird/IFlareSystemsManager';
import { iPaymentVerificationAbi as songbirdIPaymentVerificationAbi } from 'test-periphery-artifacts-wagmi-types/contracts/songbird/IPaymentVerification';
import { iReferencedPaymentNonexistenceVerificationAbi as songbirdIReferencedPaymentNonexistenceVerificationAbi } from 'test-periphery-artifacts-wagmi-types/contracts/songbird/IReferencedPaymentNonexistenceVerification';
import { flare, flareTestnet, songbird, songbirdTestnet } from 'wagmi/chains';

export function getAssetManagerAbi(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareIAssetManagerAbi;
    case flareTestnet.id: // Coston2 Testnet
      return coston2IAssetManagerAbi;
    case songbird.id: // Songbird
      return songbirdIAssetManagerAbi;
    case songbirdTestnet.id: // Coston Testnet
      return costonIAssetManagerAbi;
    default:
      // Default to Flare for backwards compatibility
      return flareIAssetManagerAbi;
  }
}

/**
 * Select the appropriate AgentOwnerRegistry ABI based on the chain ID
 * @param chainId - The chain ID to get the ABI for
 * @returns The network-specific AgentOwnerRegistry ABI
 */
export function getAgentOwnerRegistryAbi(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareIAgentOwnerRegistryAbi;
    case flareTestnet.id: // Coston2 Testnet
      return coston2IAgentOwnerRegistryAbi;
    case songbird.id: // Songbird
      return songbirdIAgentOwnerRegistryAbi;
    case songbirdTestnet.id: // Coston Testnet
      return costonIAgentOwnerRegistryAbi;
    default:
      // Default to Flare for backwards compatibility
      return flareIAgentOwnerRegistryAbi;
  }
}

/**
 * Select the appropriate FDC Hub Request Attestation hook based on the chain ID
 * @param chainId - The chain ID to get the hook for
 * @returns The network-specific FDC Hub Request Attestation hook
 */
export function getRequestAttestationHook(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareUseWriteIFdcHub();
    case flareTestnet.id: // Coston2 Testnet
      return coston2UseWriteIFdcHub();
    case songbird.id: // Songbird
      return songbirdUseWriteIFdcHub();
    case songbirdTestnet.id: // Coston Testnet
      return costonUseWriteIFdcHub();
    default:
      // Default to Flare for backwards compatibility
      return flareUseWriteIFdcHub();
  }
}

/**
 * Select the appropriate FDC Request Fee Configurations ABI based on the chain ID
 * @param chainId - The chain ID to get the ABI for
 * @returns The network-specific FDC Request Fee Configurations ABI
 */
export function getFdcRequestFeeConfigurationsAbi(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareIFdcRequestFeeConfigurationsAbi;
    case flareTestnet.id: // Coston2 Testnet
      return coston2IFdcRequestFeeConfigurationsAbi;
    case songbird.id: // Songbird
      return songbirdIFdcRequestFeeConfigurationsAbi;
    case songbirdTestnet.id: // Coston Testnet
      return costonIFdcRequestFeeConfigurationsAbi;
    default:
      // Default to Flare for backwards compatibility
      return flareIFdcRequestFeeConfigurationsAbi;
  }
}

/**
 * Select the appropriate Flare Systems Manager ABI based on the chain ID
 * @param chainId - The chain ID to get the ABI for
 * @returns The network-specific Flare Systems Manager ABI
 */
export function getFlareSystemsManagerAbi(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareIFlareSystemsManagerAbi;
    case flareTestnet.id: // Coston2 Testnet
      return coston2IFlareSystemsManagerAbi;
    case songbird.id: // Songbird
      return songbirdIFlareSystemsManagerAbi;
    case songbirdTestnet.id: // Coston Testnet
      return costonIFlareSystemsManagerAbi;
    default:
      // Default to Flare for backwards compatibility
      return flareIFlareSystemsManagerAbi;
  }
}

/**
 * Select the appropriate Payment Verification ABI based on the chain ID
 * @param chainId - The chain ID to get the ABI for
 * @returns The network-specific Payment Verification ABI
 */
export function getPaymentVerificationAbi(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareIPaymentVerificationAbi;
    case flareTestnet.id: // Coston2 Testnet
      return coston2IPaymentVerificationAbi;
    case songbird.id: // Songbird
      return songbirdIPaymentVerificationAbi;
    case songbirdTestnet.id: // Coston Testnet
      return costonIPaymentVerificationAbi;
    default:
      // Default to Flare for backwards compatibility
      return flareIPaymentVerificationAbi;
  }
}

/**
 * Select the appropriate Referenced Payment Nonexistence Verification ABI based on the chain ID
 * @param chainId - The chain ID to get the ABI for
 * @returns The network-specific Referenced Payment Nonexistence Verification ABI
 */
export function getReferencedPaymentNonexistenceVerificationAbi(
  chainId: number
) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareIReferencedPaymentNonexistenceVerificationAbi;
    case flareTestnet.id: // Coston2 Testnet
      return coston2IReferencedPaymentNonexistenceVerificationAbi;
    case songbird.id: // Songbird
      return songbirdIReferencedPaymentNonexistenceVerificationAbi;
    case songbirdTestnet.id: // Coston Testnet
      return costonIReferencedPaymentNonexistenceVerificationAbi;
    default:
      // Default to Flare for backwards compatibility
      return flareIReferencedPaymentNonexistenceVerificationAbi;
  }
}

/**
 * Select the appropriate FTSO V2 Interface ABI based on the chain ID
 * @param chainId - The chain ID to get the ABI for
 * @returns The network-specific FTSO V2 Interface ABI
 */
export function getFtsoV2InterfaceAbi(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareFtsoV2InterfaceAbi;
    case flareTestnet.id: // Coston2 Testnet
      return coston2FtsoV2InterfaceAbi;
    case songbird.id: // Songbird
      return songbirdFtsoV2InterfaceAbi;
    case songbirdTestnet.id: // Coston Testnet
      return costonFtsoV2InterfaceAbi;
    default:
      // Default to Flare for backwards compatibility
      return flareFtsoV2InterfaceAbi;
  }
}

/**
 * Select the appropriate AssetManager Execute Minting hook based on the chain ID
 * @param chainId - The chain ID to get the hook for
 * @returns The network-specific AssetManager Execute Minting hook
 */
/**
 * Select the appropriate AssetManager Reserve Collateral hook based on the chain ID
 * @param chainId - The chain ID to get the hook for
 * @returns The network-specific AssetManager Reserve Collateral hook
 */
export function getReserveCollateralHook(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareUseWriteIAssetManager();
    case flareTestnet.id: // Coston2 Testnet
      return coston2UseWriteIAssetManager();
    case songbird.id: // Songbird
      return songbirdUseWriteIAssetManager();
    case songbirdTestnet.id: // Coston Testnet
      return costonUseWriteIAssetManager();
    default:
      // Default to Flare for backwards compatibility
      return flareUseWriteIAssetManager();
  }
}
