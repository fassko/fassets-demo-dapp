// Network-specific ABIs from @flarenetwork/flare-periphery-contract-artifacts.
// AssetManager is a diamond: use composed slices / published extensions, not IAssetManager.
// Fragment arrays in peripheryAbi.ts type the live package ABIs for viem and wagmi.

import {
  flare as flareChain,
  flareTestnet,
  songbird as songbirdChain,
  songbirdTestnet,
} from 'wagmi/chains';
import {
  createUseReadContract,
  createUseWatchContractEvent,
  createUseWriteContract,
} from 'wagmi/codegen';

import {
  coston,
  coston2,
  flare,
  songbird,
} from '@flarenetwork/flare-periphery-contract-artifacts';

import { type Abi, type ReadContractReturnType } from 'viem';

import { SYSTEM_REDEMPTION_FEE_PAID_EVENT } from '@/lib/fxrpRedemptions';
import {
  ftsoV2InterfaceAbi,
  iAssetManagerAgentsAbi,
  iAssetManagerInfoAbi,
  iAssetManagerRedemptionAbi,
  iDirectMintingAbi,
  iDirectMintingSettingsAbi,
  iFAssetAbi,
  iFdcHubAbi,
  iFlareSystemsManagerAbi,
  iMintingTagManagerAbi,
  iRedeemExtendedAbi,
  iRedeemExtendedSettingsAbi,
  iReferencedPaymentNonexistenceVerificationAbi,
} from '@/lib/peripheryAbi';

const networks = {
  flare,
  coston2,
  songbird,
  coston,
} as const;

type NetworkName = keyof typeof networks;

function networkName(chainId: number): NetworkName {
  switch (chainId) {
    case flareChain.id:
      return 'flare';
    case flareTestnet.id:
      return 'coston2';
    case songbirdChain.id:
      return 'songbird';
    case songbirdTestnet.id:
      return 'coston';
    default:
      return 'flare';
  }
}

type NamedAbiItem = { name?: string };

/** Live interface ABI from the artifacts package, typed as the app's fragment. */
function fromArtifacts<const T extends readonly NamedAbiItem[]>(
  chainId: number,
  interfaceName: string,
  typed: T
): T {
  const names = new Set(typed.map(item => item.name));
  const live = getInterfaceAbi(chainId, interfaceName).filter(
    (item): item is Extract<Abi[number], { name: string }> =>
      'name' in item && names.has(item.name)
  );
  if (live.length !== typed.length) {
    throw new Error(
      `Interface "${interfaceName}" on chain ${chainId} is missing ABI items expected from @flarenetwork/flare-periphery-contract-artifacts`
    );
  }
  return live as unknown as T;
}

export function getInterfaceAbi(chainId: number, interfaceName: string): Abi {
  const abi = networks[networkName(chainId)].interfaceAbis[interfaceName];
  if (!Array.isArray(abi)) {
    throw new Error(
      `Interface ABI "${interfaceName}" not found for chain ${chainId}`
    );
  }
  return abi as Abi;
}

export type GetSettingsReturnType = ReadContractReturnType<
  typeof iAssetManagerInfoAbi,
  'getSettings'
>;
export type GetAllAgentsReturnType = ReadContractReturnType<
  typeof iAssetManagerAgentsAbi,
  'getAllAgents'
>;
export type GetAgentInfoReturnType = ReadContractReturnType<
  typeof iAssetManagerAgentsAbi,
  'getAgentInfo'
>;

export function getTypedSettings(
  rawSettings: unknown
): GetSettingsReturnType | undefined {
  return rawSettings as GetSettingsReturnType | undefined;
}

export function getAssetManagerAgentsAbi(chainId: number) {
  return fromArtifacts(chainId, 'IAssetManagerAgents', iAssetManagerAgentsAbi);
}

export function getAssetManagerRedemptionAbi(chainId: number) {
  return fromArtifacts(
    chainId,
    'IAssetManagerRedemption',
    iAssetManagerRedemptionAbi
  );
}

/** Redemption + redeem-with-tag events for receipt log decoding. */
export function getRedemptionEventAbi(chainId: number) {
  return [
    ...fromArtifacts(
      chainId,
      'IAssetManagerRedemption',
      iAssetManagerRedemptionAbi
    ),
    ...fromArtifacts(chainId, 'IRedeemExtended', iRedeemExtendedAbi),
    SYSTEM_REDEMPTION_FEE_PAID_EVENT,
  ] as const;
}

export function getReadIAssetManagerInfoGetSettings(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IAssetManagerInfo', iAssetManagerInfoAbi),
    functionName: 'getSettings',
  });
}

export function getReadIAssetManagerAgentsGetAllAgents(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IAssetManagerAgents', iAssetManagerAgentsAbi),
    functionName: 'getAllAgents',
  });
}

export function getReadIDirectMintingDirectMintingPaymentAddress(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IDirectMinting', iDirectMintingAbi),
    functionName: 'directMintingPaymentAddress',
  });
}

export function getReadIDirectMintingSettingsGetDirectMintingFeeBips(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(
      chainId,
      'IDirectMintingSettings',
      iDirectMintingSettingsAbi
    ),
    functionName: 'getDirectMintingFeeBIPS',
  });
}

export function getReadIDirectMintingSettingsGetDirectMintingMinimumFeeUba(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(
      chainId,
      'IDirectMintingSettings',
      iDirectMintingSettingsAbi
    ),
    functionName: 'getDirectMintingMinimumFeeUBA',
  });
}

export function getReadIDirectMintingSettingsGetDirectMintingExecutorFeeUba(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(
      chainId,
      'IDirectMintingSettings',
      iDirectMintingSettingsAbi
    ),
    functionName: 'getDirectMintingExecutorFeeUBA',
  });
}

export function getReadIDirectMintingSettingsGetMintingTagManager(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(
      chainId,
      'IDirectMintingSettings',
      iDirectMintingSettingsAbi
    ),
    functionName: 'getMintingTagManager',
  });
}

export function getReadIRedeemExtendedSettingsMinimumRedeemAmountUba(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(
      chainId,
      'IRedeemExtendedSettings',
      iRedeemExtendedSettingsAbi
    ),
    functionName: 'minimumRedeemAmountUBA',
  });
}

export function getWriteIRedeemExtendedRedeemAmount(chainId: number) {
  return createUseWriteContract({
    abi: fromArtifacts(chainId, 'IRedeemExtended', iRedeemExtendedAbi),
    functionName: 'redeemAmount',
  })();
}

export function getWriteIRedeemExtendedRedeemWithTag(chainId: number) {
  return createUseWriteContract({
    abi: fromArtifacts(chainId, 'IRedeemExtended', iRedeemExtendedAbi),
    functionName: 'redeemWithTag',
  })();
}

export function getWriteIFdcHubRequestAttestation(chainId: number) {
  return createUseWriteContract({
    abi: fromArtifacts(chainId, 'IFdcHub', iFdcHubAbi),
    functionName: 'requestAttestation',
  })();
}

export function getFdcRequestFeeConfigurationsAbi(chainId: number) {
  return getInterfaceAbi(chainId, 'IFdcRequestFeeConfigurations');
}

export function getFlareSystemsManagerAbi(chainId: number) {
  return getInterfaceAbi(chainId, 'IFlareSystemsManager');
}

export function getReadIFlareSystemsManagerFirstVotingRoundStartTs(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(
      chainId,
      'IFlareSystemsManager',
      iFlareSystemsManagerAbi
    ),
    functionName: 'firstVotingRoundStartTs',
  });
}

export function getReadIFlareSystemsManagerVotingEpochDurationSeconds(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(
      chainId,
      'IFlareSystemsManager',
      iFlareSystemsManagerAbi
    ),
    functionName: 'votingEpochDurationSeconds',
  });
}

export function getReferencedPaymentNonexistenceVerificationAbi(
  chainId: number
) {
  return fromArtifacts(
    chainId,
    'IReferencedPaymentNonexistenceVerification',
    iReferencedPaymentNonexistenceVerificationAbi
  );
}

export function getFtsoV2InterfaceAbi(chainId: number) {
  return fromArtifacts(chainId, 'FtsoV2Interface', ftsoV2InterfaceAbi);
}

export function getReadIfAssetName(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IFAsset', iFAssetAbi),
    functionName: 'name',
  });
}

export function getReadIfAssetSymbol(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IFAsset', iFAssetAbi),
    functionName: 'symbol',
  });
}

export function getReadIfAssetDecimals(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IFAsset', iFAssetAbi),
    functionName: 'decimals',
  });
}

export function getReadIfAssetAssetName(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IFAsset', iFAssetAbi),
    functionName: 'assetName',
  });
}

export function getReadIfAssetAssetSymbol(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IFAsset', iFAssetAbi),
    functionName: 'assetSymbol',
  });
}

export function getReadIfAssetBalanceOf(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IFAsset', iFAssetAbi),
    functionName: 'balanceOf',
  });
}

export function getReadIfAssetTotalSupply(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IFAsset', iFAssetAbi),
    functionName: 'totalSupply',
  });
}

export function getWriteIfAssetTransfer(chainId: number) {
  return createUseWriteContract({
    abi: fromArtifacts(chainId, 'IFAsset', iFAssetAbi),
    functionName: 'transfer',
  })();
}

export function getWatchIDirectMintingDirectMintingExecutedEvent(
  chainId: number
) {
  return createUseWatchContractEvent({
    abi: fromArtifacts(chainId, 'IDirectMinting', iDirectMintingAbi),
    eventName: 'DirectMintingExecuted',
  });
}

export function getReadIMintingTagManagerReservationFee(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'reservationFee',
  });
}

export function getReadIMintingTagManagerReservedTagsForOwner(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'reservedTagsForOwner',
  });
}

export function getReadIMintingTagManagerMintingRecipient(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'mintingRecipient',
  });
}

export function getReadIMintingTagManagerAllowedExecutor(chainId: number) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'allowedExecutor',
  });
}

export function getReadIMintingTagManagerPendingAllowedExecutorChange(
  chainId: number
) {
  return createUseReadContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'pendingAllowedExecutorChange',
  });
}

export function getWriteIMintingTagManagerReserve(chainId: number) {
  return createUseWriteContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'reserve',
  })();
}

export function getWriteIMintingTagManagerSetMintingRecipient(
  chainId: number
) {
  return createUseWriteContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'setMintingRecipient',
  })();
}

export function getWriteIMintingTagManagerSetAllowedExecutor(chainId: number) {
  return createUseWriteContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'setAllowedExecutor',
  })();
}

export function getWriteIMintingTagManagerTransfer(chainId: number) {
  return createUseWriteContract({
    abi: fromArtifacts(chainId, 'IMintingTagManager', iMintingTagManagerAbi),
    functionName: 'transfer',
  })();
}
