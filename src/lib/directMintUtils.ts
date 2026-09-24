// Direct minting utilities for XRPL payments to the Core Vault
// https://dev.flare.network/fassets/direct-minting

import type { Address } from 'viem';

// Direct minting memo prefix (DIRECT_MINTING type)
// https://dev.flare.network/fassets/direct-minting
const DIRECT_MINTING_PREFIX = '4642505266410018'; // 8 bytes

/**
 * Builds the 32-byte direct minting memo for XRPL payment
 * Format: 8-byte prefix + 4-byte zero padding + 20-byte recipient EVM address
 */
export function buildDirectMintingMemo(recipientAddress: Address): string {
  return (
    DIRECT_MINTING_PREFIX + '00000000' + recipientAddress.slice(2).toLowerCase()
  );
}

export function getXrplTestnetExplorerUrl(txHash: string): string {
  return `https://testnet.xrpl.org/transactions/${txHash}`;
}
