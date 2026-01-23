// Utility functions for selecting network-specific ABIs and hooks
// Maps chain IDs to the appropriate ABIs and hooks from @flarenetwork/flare-wagmi-periphery-package
import { flare, flareTestnet, songbird, songbirdTestnet } from 'wagmi/chains';


import { ftsoV2InterfaceAbi as costonFtsoV2InterfaceAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/FtsoV2Interface';
import { iAgentOwnerRegistryAbi as costonIAgentOwnerRegistryAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/IAgentOwnerRegistry';
import {
  iAssetManagerAbi as costonIAssetManagerAbi,
  useReadIAssetManager as costonUseReadIAssetManager,
  useWatchIAssetManagerEvent as costonUseWatchIAssetManagerEvent,
  useWriteIAssetManager as costonUseWriteIAssetManager,
} from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/IAssetManager';
import {
  ifAssetAbi as costonIFAssetAbi,
  useReadIfAsset as costonUseReadIFAsset,
  useWriteIfAsset as costonUseWriteIFAsset,
} from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/IFAsset';
import { useWriteIFdcHub as costonUseWriteIFdcHub } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/IFdcHub';
import { iFdcRequestFeeConfigurationsAbi as costonIFdcRequestFeeConfigurationsAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/IFdcRequestFeeConfigurations';
import { iFlareSystemsManagerAbi as costonIFlareSystemsManagerAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/IFlareSystemsManager';
import { iPaymentVerificationAbi as costonIPaymentVerificationAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/IPaymentVerification';
import { iReferencedPaymentNonexistenceVerificationAbi as costonIReferencedPaymentNonexistenceVerificationAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston/IReferencedPaymentNonexistenceVerification';
import { ftsoV2InterfaceAbi as coston2FtsoV2InterfaceAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/FtsoV2Interface';
import { iAgentOwnerRegistryAbi as coston2IAgentOwnerRegistryAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/IAgentOwnerRegistry';
import {
  iAssetManagerAbi as coston2IAssetManagerAbi,
  useReadIAssetManager as coston2UseReadIAssetManager,
  useWatchIAssetManagerEvent as coston2UseWatchIAssetManagerEvent,
  useWriteIAssetManager as coston2UseWriteIAssetManager,
} from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/IAssetManager';
import {
  ifAssetAbi as coston2IFAssetAbi,
  useReadIfAsset as coston2UseReadIFAsset,
  useWriteIfAsset as coston2UseWriteIFAsset,
} from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/IFAsset';
import { useWriteIFdcHub as coston2UseWriteIFdcHub } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/IFdcHub';
import { iFdcRequestFeeConfigurationsAbi as coston2IFdcRequestFeeConfigurationsAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/IFdcRequestFeeConfigurations';
import { iFlareSystemsManagerAbi as coston2IFlareSystemsManagerAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/IFlareSystemsManager';
import { iPaymentVerificationAbi as coston2IPaymentVerificationAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/IPaymentVerification';
import { iReferencedPaymentNonexistenceVerificationAbi as coston2IReferencedPaymentNonexistenceVerificationAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/coston2/IReferencedPaymentNonexistenceVerification';
import { ftsoV2InterfaceAbi as flareFtsoV2InterfaceAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/FtsoV2Interface';
import { iAgentOwnerRegistryAbi as flareIAgentOwnerRegistryAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/IAgentOwnerRegistry';
import {
  iAssetManagerAbi as flareIAssetManagerAbi,
  useReadIAssetManager as flareUseReadIAssetManager,
  useWatchIAssetManagerEvent as flareUseWatchIAssetManagerEvent,
  useWriteIAssetManager as flareUseWriteIAssetManager,
} from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/IAssetManager';
import {
  ifAssetAbi as flareIFAssetAbi,
  useReadIfAsset as flareUseReadIFAsset,
  useWriteIfAsset as flareUseWriteIFAsset,
} from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/IFAsset';
import { useWriteIFdcHub as flareUseWriteIFdcHub } from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/IFdcHub';
import { iFdcRequestFeeConfigurationsAbi as flareIFdcRequestFeeConfigurationsAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/IFdcRequestFeeConfigurations';
import { iFlareSystemsManagerAbi as flareIFlareSystemsManagerAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/IFlareSystemsManager';
import { iPaymentVerificationAbi as flareIPaymentVerificationAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/IPaymentVerification';
import { iReferencedPaymentNonexistenceVerificationAbi as flareIReferencedPaymentNonexistenceVerificationAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/flare/IReferencedPaymentNonexistenceVerification';
import { ftsoV2InterfaceAbi as songbirdFtsoV2InterfaceAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/FtsoV2Interface';
import { iAgentOwnerRegistryAbi as songbirdIAgentOwnerRegistryAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/IAgentOwnerRegistry';
import {
  iAssetManagerAbi as songbirdIAssetManagerAbi,
  useReadIAssetManager as songbirdUseReadIAssetManager,
  useWatchIAssetManagerEvent as songbirdUseWatchIAssetManagerEvent,
  useWriteIAssetManager as songbirdUseWriteIAssetManager,
} from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/IAssetManager';
import {
  ifAssetAbi as songbirdIFAssetAbi,
  useReadIfAsset as songbirdUseReadIFAsset,
  useWriteIfAsset as songbirdUseWriteIFAsset,
} from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/IFAsset';
import { useWriteIFdcHub as songbirdUseWriteIFdcHub } from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/IFdcHub';
import { iFdcRequestFeeConfigurationsAbi as songbirdIFdcRequestFeeConfigurationsAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/IFdcRequestFeeConfigurations';
import { iFlareSystemsManagerAbi as songbirdIFlareSystemsManagerAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/IFlareSystemsManager';
import { iPaymentVerificationAbi as songbirdIPaymentVerificationAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/IPaymentVerification';
import { iReferencedPaymentNonexistenceVerificationAbi as songbirdIReferencedPaymentNonexistenceVerificationAbi } from '@flarenetwork/flare-wagmi-periphery-package/contracts/songbird/IReferencedPaymentNonexistenceVerification';

import { type ReadContractReturnType } from 'viem';

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
 * Type helper to extract the return type of getSettings from the AssetManager ABI
 * This provides proper type inference for settings objects returned from useAssetManager
 */
export type AssetManagerAbi = ReturnType<typeof getAssetManagerAbi>;
export type GetSettingsReturnType = ReadContractReturnType<
  AssetManagerAbi,
  'getSettings'
>;

/**
 * Helper function to properly type settings from useAssetManager hook
 * @param rawSettings - The raw settings object from useAssetManager (may be untyped)
 * @returns Properly typed settings object or undefined
 */
export function getTypedSettings(
  rawSettings: unknown
): GetSettingsReturnType | undefined {
  return rawSettings as GetSettingsReturnType | undefined;
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
 * Select the appropriate IFAsset ABI based on the chain ID
 * @param chainId - The chain ID to get the ABI for
 * @returns The network-specific IFAsset ABI
 */
export function getIFAssetAbi(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareIFAssetAbi;
    case flareTestnet.id: // Coston2 Testnet
      return coston2IFAssetAbi;
    case songbird.id: // Songbird
      return songbirdIFAssetAbi;
    case songbirdTestnet.id: // Coston Testnet
      return costonIFAssetAbi;
    default:
      // Default to Flare for backwards compatibility
      return flareIFAssetAbi;
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
export function getWriteIAssetManager(chainId: number) {
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

/**
 * Select the appropriate AssetManager Watch Event hook based on the chain ID
 * @param chainId - The chain ID to get the hook for
 * @returns The network-specific AssetManager Watch Event hook
 */
export function getWatchIAssetManagerEvent(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareUseWatchIAssetManagerEvent;
    case flareTestnet.id: // Coston2 Testnet
      return coston2UseWatchIAssetManagerEvent;
    case songbird.id: // Songbird
      return songbirdUseWatchIAssetManagerEvent;
    case songbirdTestnet.id: // Coston Testnet
      return costonUseWatchIAssetManagerEvent;
    default:
      // Default to Flare for backwards compatibility
      return flareUseWatchIAssetManagerEvent;
  }
}

/**
 * Select the appropriate AssetManager Read hook based on the chain ID
 * @param chainId - The chain ID to get the hook for
 * @returns The network-specific AssetManager Read hook
 */
export function getReadIAssetManager(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareUseReadIAssetManager;
    case flareTestnet.id: // Coston2 Testnet
      return coston2UseReadIAssetManager;
    case songbird.id: // Songbird
      return songbirdUseReadIAssetManager;
    case songbirdTestnet.id: // Coston Testnet
      return costonUseReadIAssetManager;
    default:
      // Default to Flare for backwards compatibility
      return flareUseReadIAssetManager;
  }
}

/**
 * Select the appropriate IFAsset Read hook based on the chain ID
 * @param chainId - The chain ID to get the hook for
 * @returns The network-specific IFAsset Read hook
 */
export function getReadIFAsset(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareUseReadIFAsset;
    case flareTestnet.id: // Coston2 Testnet
      return coston2UseReadIFAsset;
    case songbird.id: // Songbird
      return songbirdUseReadIFAsset;
    case songbirdTestnet.id: // Coston Testnet
      return costonUseReadIFAsset;
    default:
      // Default to Flare for backwards compatibility
      return flareUseReadIFAsset;
  }
}

/**
 * Select the appropriate IFAsset Write hook based on the chain ID
 * @param chainId - The chain ID to get the hook for
 * @returns The network-specific IFAsset Write hook
 */
export function getWriteIFAsset(chainId: number) {
  switch (chainId) {
    case flare.id: // Flare Mainnet
      return flareUseWriteIFAsset();
    case flareTestnet.id: // Coston2 Testnet
      return coston2UseWriteIFAsset();
    case songbird.id: // Songbird
      return songbirdUseWriteIFAsset();
    case songbirdTestnet.id: // Coston Testnet
      return costonUseWriteIFAsset();
    default:
      // Default to Flare for backwards compatibility
      return flareUseWriteIFAsset();
  }
}
