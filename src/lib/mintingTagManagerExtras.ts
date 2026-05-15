/** Not yet in all published periphery ABIs; matches IMintingTagManager on-chain. */
export const mintingTagManagerExtraWriteAbi = [
  {
    type: 'function',
    inputs: [
      { name: '_mintingTag', internalType: 'uint256', type: 'uint256' },
      { name: '_executor', internalType: 'address', type: 'address' },
    ],
    name: 'setAllowedExecutor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
