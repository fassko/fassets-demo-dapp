// Typed ABI fragments taken from @flarenetwork/flare-periphery-contract-artifacts.
// abiUtils loads the matching items from that package and uses these arrays as their type.

export const iAssetManagerInfoAbi = [
  {
    inputs: [],
    name: 'getSettings',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'assetManagerController',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'fAsset',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'agentVaultFactory',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'collateralPoolFactory',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'collateralPoolTokenFactory',
            type: 'address',
          },
          {
            internalType: 'string',
            name: 'poolTokenSuffix',
            type: 'string',
          },
          {
            internalType: 'address',
            name: '__whitelist',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'agentOwnerRegistry',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'fdcVerification',
            type: 'address',
          },
          {
            internalType: 'address payable',
            name: 'burnAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'priceReader',
            type: 'address',
          },
          {
            internalType: 'uint8',
            name: 'assetDecimals',
            type: 'uint8',
          },
          {
            internalType: 'uint8',
            name: 'assetMintingDecimals',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'chainId',
            type: 'bytes32',
          },
          {
            internalType: 'uint32',
            name: 'averageBlockTimeMS',
            type: 'uint32',
          },
          {
            internalType: 'uint32',
            name: 'mintingPoolHoldingsRequiredBIPS',
            type: 'uint32',
          },
          {
            internalType: 'uint16',
            name: 'collateralReservationFeeBIPS',
            type: 'uint16',
          },
          {
            internalType: 'uint64',
            name: 'assetUnitUBA',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'assetMintingGranularityUBA',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'lotSizeAMG',
            type: 'uint64',
          },
          {
            internalType: 'uint16',
            name: '__minUnderlyingBackingBIPS',
            type: 'uint16',
          },
          {
            internalType: 'bool',
            name: '__requireEOAAddressProof',
            type: 'bool',
          },
          {
            internalType: 'uint64',
            name: 'mintingCapAMG',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'underlyingBlocksForPayment',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'underlyingSecondsForPayment',
            type: 'uint64',
          },
          {
            internalType: 'uint16',
            name: 'redemptionFeeBIPS',
            type: 'uint16',
          },
          {
            internalType: 'uint32',
            name: 'redemptionDefaultFactorVaultCollateralBIPS',
            type: 'uint32',
          },
          {
            internalType: 'uint32',
            name: '__redemptionDefaultFactorPoolBIPS',
            type: 'uint32',
          },
          {
            internalType: 'uint64',
            name: 'confirmationByOthersAfterSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint128',
            name: 'confirmationByOthersRewardUSD5',
            type: 'uint128',
          },
          {
            internalType: 'uint16',
            name: 'maxRedeemedTickets',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'paymentChallengeRewardBIPS',
            type: 'uint16',
          },
          {
            internalType: 'uint128',
            name: 'paymentChallengeRewardUSD5',
            type: 'uint128',
          },
          {
            internalType: 'uint64',
            name: 'withdrawalWaitMinSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'maxTrustedPriceAgeSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: '__ccbTimeSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'attestationWindowSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'minUpdateRepeatTimeSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: '__buybackCollateralFactorBIPS',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: '__announcedUnderlyingConfirmationMinSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: '__tokenInvalidationTimeMinSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint32',
            name: 'vaultCollateralBuyForFlareFactorBIPS',
            type: 'uint32',
          },
          {
            internalType: 'uint64',
            name: 'agentExitAvailableTimelockSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'agentFeeChangeTimelockSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'agentMintingCRChangeTimelockSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'poolExitCRChangeTimelockSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'agentTimelockedOperationWindowSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint32',
            name: 'collateralPoolTokenTimelockSeconds',
            type: 'uint32',
          },
          {
            internalType: 'uint64',
            name: 'liquidationStepSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint256[]',
            name: 'liquidationCollateralFactorBIPS',
            type: 'uint256[]',
          },
          {
            internalType: 'uint256[]',
            name: 'liquidationFactorVaultCollateralBIPS',
            type: 'uint256[]',
          },
          {
            internalType: 'uint64',
            name: 'diamondCutMinTimelockSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'maxEmergencyPauseDurationSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'emergencyPauseDurationResetAfterSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: '__cancelCollateralReservationAfterSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint16',
            name: '__rejectOrCancelCollateralReservationReturnFactorBIPS',
            type: 'uint16',
          },
          {
            internalType: 'uint64',
            name: '__rejectRedemptionRequestWindowSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: '__takeOverRedemptionRequestWindowSeconds',
            type: 'uint64',
          },
          {
            internalType: 'uint32',
            name: '__rejectedRedemptionDefaultFactorVaultCollateralBIPS',
            type: 'uint32',
          },
          {
            internalType: 'uint32',
            name: '__rejectedRedemptionDefaultFactorPoolBIPS',
            type: 'uint32',
          },
        ],
        internalType: 'struct AssetManagerSettings.Data',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const iAssetManagerAgentsAbi = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_start',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_end',
        type: 'uint256',
      },
    ],
    name: 'getAllAgents',
    outputs: [
      {
        internalType: 'address[]',
        name: '_agents',
        type: 'address[]',
      },
      {
        internalType: 'uint256',
        name: '_totalLength',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_agentVault',
        type: 'address',
      },
    ],
    name: 'getAgentInfo',
    outputs: [
      {
        components: [
          {
            internalType: 'enum AgentInfo.Status',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'ownerManagementAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'ownerWorkAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'collateralPool',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'collateralPoolToken',
            type: 'address',
          },
          {
            internalType: 'string',
            name: 'underlyingAddressString',
            type: 'string',
          },
          {
            internalType: 'bool',
            name: 'publiclyAvailable',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'feeBIPS',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'poolFeeShareBIPS',
            type: 'uint256',
          },
          {
            internalType: 'contract IERC20',
            name: 'vaultCollateralToken',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'mintingVaultCollateralRatioBIPS',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'mintingPoolCollateralRatioBIPS',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'freeCollateralLots',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalVaultCollateralWei',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'freeVaultCollateralWei',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'vaultCollateralRatioBIPS',
            type: 'uint256',
          },
          {
            internalType: 'contract IERC20',
            name: 'poolWNatToken',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'totalPoolCollateralNATWei',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'freePoolCollateralNATWei',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'poolCollateralRatioBIPS',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalAgentPoolTokensWei',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'announcedVaultCollateralWithdrawalWei',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'announcedPoolTokensWithdrawalWei',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'freeAgentPoolTokensWei',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'mintedUBA',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'reservedUBA',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'redeemingUBA',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'poolRedeemingUBA',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'dustUBA',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'liquidationStartTimestamp',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxLiquidationAmountUBA',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'liquidationPaymentFactorVaultBIPS',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'liquidationPaymentFactorPoolBIPS',
            type: 'uint256',
          },
          {
            internalType: 'int256',
            name: 'underlyingBalanceUBA',
            type: 'int256',
          },
          {
            internalType: 'uint256',
            name: 'requiredUnderlyingBalanceUBA',
            type: 'uint256',
          },
          {
            internalType: 'int256',
            name: 'freeUnderlyingBalanceUBA',
            type: 'int256',
          },
          {
            internalType: 'uint256',
            name: 'announcedUnderlyingWithdrawalId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'buyFAssetByAgentFactorBIPS',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'poolExitCollateralRatioBIPS',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'redemptionPoolFeeShareBIPS',
            type: 'uint256',
          },
        ],
        internalType: 'struct AgentInfo.Info',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const iAssetManagerRedemptionAbi = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_firstRedemptionTicketId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_pageSize',
        type: 'uint256',
      },
    ],
    name: 'redemptionQueue',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'redemptionTicketId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'agentVault',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'ticketValueUBA',
            type: 'uint256',
          },
        ],
        internalType: 'struct RedemptionTicketInfo.Data[]',
        name: '_queue',
        type: 'tuple[]',
      },
      {
        internalType: 'uint256',
        name: '_nextRedemptionTicketId',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'agentVault',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'requestId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'paymentAddress',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'valueUBA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'feeUBA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'firstUnderlyingBlock',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'lastUnderlyingBlock',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'lastUnderlyingTimestamp',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'paymentReference',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'executor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'executorFeeNatWei',
        type: 'uint256',
      },
    ],
    name: 'RedemptionRequested',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'remainingLots',
        type: 'uint256',
      },
    ],
    name: 'RedemptionRequestIncomplete',
    type: 'event',
  },
] as const;

export const iDirectMintingAbi = [
  {
    inputs: [],
    name: 'directMintingPaymentAddress',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'transactionId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'targetAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'executor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'mintedAmountUBA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'mintingFeeUBA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'executorFeeUBA',
        type: 'uint256',
      },
    ],
    name: 'DirectMintingExecuted',
    type: 'event',
  },
] as const;

export const iDirectMintingSettingsAbi = [
  {
    inputs: [],
    name: 'getDirectMintingFeeBIPS',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDirectMintingMinimumFeeUBA',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDirectMintingExecutorFeeUBA',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMintingTagManager',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const iFAssetAbi = [
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'assetName',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'assetSymbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const iFdcHubAbi = [
  {
    inputs: [
      {
        internalType: 'bytes',
        name: '_data',
        type: 'bytes',
      },
    ],
    name: 'requestAttestation',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const iFlareSystemsManagerAbi = [
  {
    inputs: [],
    name: 'firstVotingRoundStartTs',
    outputs: [
      {
        internalType: 'uint64',
        name: '',
        type: 'uint64',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'votingEpochDurationSeconds',
    outputs: [
      {
        internalType: 'uint64',
        name: '',
        type: 'uint64',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const iMintingTagManagerAbi = [
  {
    inputs: [],
    name: 'reservationFee',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'reservedTagsForOwner',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_mintingTag',
        type: 'uint256',
      },
    ],
    name: 'mintingRecipient',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_mintingTag',
        type: 'uint256',
      },
    ],
    name: 'allowedExecutor',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_mintingTag',
        type: 'uint256',
      },
    ],
    name: 'pendingAllowedExecutorChange',
    outputs: [
      {
        internalType: 'bool',
        name: '_pending',
        type: 'bool',
      },
      {
        internalType: 'address',
        name: '_newExecutor',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_activeAfterTs',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'reserve',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_mintingTag',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_recipient',
        type: 'address',
      },
    ],
    name: 'setMintingRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_mintingTag',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_executor',
        type: 'address',
      },
    ],
    name: 'setAllowedExecutor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_mintingTag',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const iRedeemExtendedAbi = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_amountUBA',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: '_redeemerUnderlyingAddressString',
        type: 'string',
      },
      {
        internalType: 'address payable',
        name: '_executor',
        type: 'address',
      },
    ],
    name: 'redeemAmount',
    outputs: [
      {
        internalType: 'uint256',
        name: '_redeemedAmountUBA',
        type: 'uint256',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_amountUBA',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: '_redeemerUnderlyingAddressString',
        type: 'string',
      },
      {
        internalType: 'address payable',
        name: '_executor',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_destinationTag',
        type: 'uint256',
      },
    ],
    name: 'redeemWithTag',
    outputs: [
      {
        internalType: 'uint256',
        name: '_redeemedAmountUBA',
        type: 'uint256',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'remainingAmountUBA',
        type: 'uint256',
      },
    ],
    name: 'RedemptionAmountIncomplete',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'agentVault',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'requestId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'paymentAddress',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'valueUBA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'feeUBA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'firstUnderlyingBlock',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'lastUnderlyingBlock',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'lastUnderlyingTimestamp',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'paymentReference',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'executor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'executorFeeNatWei',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'destinationTag',
        type: 'uint256',
      },
    ],
    name: 'RedemptionWithTagRequested',
    type: 'event',
  },
] as const;

export const iRedeemExtendedSettingsAbi = [
  {
    inputs: [],
    name: 'minimumRedeemAmountUBA',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ftsoV2InterfaceAbi = [
  {
    inputs: [
      {
        internalType: 'bytes21[]',
        name: '_feedIds',
        type: 'bytes21[]',
      },
    ],
    name: 'getFeedsById',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '_values',
        type: 'uint256[]',
      },
      {
        internalType: 'int8[]',
        name: '_decimals',
        type: 'int8[]',
      },
      {
        internalType: 'uint64',
        name: '_timestamp',
        type: 'uint64',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const iReferencedPaymentNonexistenceVerificationAbi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32[]',
            name: 'merkleProof',
            type: 'bytes32[]',
          },
          {
            components: [
              {
                internalType: 'bytes32',
                name: 'attestationType',
                type: 'bytes32',
              },
              {
                internalType: 'bytes32',
                name: 'sourceId',
                type: 'bytes32',
              },
              {
                internalType: 'uint64',
                name: 'votingRound',
                type: 'uint64',
              },
              {
                internalType: 'uint64',
                name: 'lowestUsedTimestamp',
                type: 'uint64',
              },
              {
                components: [
                  {
                    internalType: 'uint64',
                    name: 'minimalBlockNumber',
                    type: 'uint64',
                  },
                  {
                    internalType: 'uint64',
                    name: 'deadlineBlockNumber',
                    type: 'uint64',
                  },
                  {
                    internalType: 'uint64',
                    name: 'deadlineTimestamp',
                    type: 'uint64',
                  },
                  {
                    internalType: 'bytes32',
                    name: 'destinationAddressHash',
                    type: 'bytes32',
                  },
                  {
                    internalType: 'uint256',
                    name: 'amount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'bytes32',
                    name: 'standardPaymentReference',
                    type: 'bytes32',
                  },
                  {
                    internalType: 'bool',
                    name: 'checkSourceAddresses',
                    type: 'bool',
                  },
                  {
                    internalType: 'bytes32',
                    name: 'sourceAddressesRoot',
                    type: 'bytes32',
                  },
                ],
                internalType:
                  'struct IReferencedPaymentNonexistence.RequestBody',
                name: 'requestBody',
                type: 'tuple',
              },
              {
                components: [
                  {
                    internalType: 'uint64',
                    name: 'minimalBlockTimestamp',
                    type: 'uint64',
                  },
                  {
                    internalType: 'uint64',
                    name: 'firstOverflowBlockNumber',
                    type: 'uint64',
                  },
                  {
                    internalType: 'uint64',
                    name: 'firstOverflowBlockTimestamp',
                    type: 'uint64',
                  },
                ],
                internalType:
                  'struct IReferencedPaymentNonexistence.ResponseBody',
                name: 'responseBody',
                type: 'tuple',
              },
            ],
            internalType: 'struct IReferencedPaymentNonexistence.Response',
            name: 'data',
            type: 'tuple',
          },
        ],
        internalType: 'struct IReferencedPaymentNonexistence.Proof',
        name: '_proof',
        type: 'tuple',
      },
    ],
    name: 'verifyReferencedPaymentNonexistence',
    outputs: [
      {
        internalType: 'bool',
        name: '_proved',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
