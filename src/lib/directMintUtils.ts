// Direct minting utilities for XRPL payments to the Core Vault
// https://dev.flare.network/fassets/direct-minting
import { Client, Wallet } from 'xrpl';

import type { Address } from 'viem';

import { XRP_CONFIG } from './xrpUtils';

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

export async function sendXrplPayment({
  destination,
  amount,
  memos,
  wallet,
  client,
}: {
  destination: string;
  amount: number;
  memos: Array<{ Memo: { MemoData: string } }>;
  wallet: Wallet;
  client: Client;
}) {
  const drops = String(Math.floor(amount * XRP_CONFIG.DROPS_PER_XRP));

  const prepared = await client.autofill({
    TransactionType: 'Payment',
    Account: wallet.address,
    Amount: drops,
    Destination: destination,
    Memos: memos,
  });

  const signed = wallet.sign(prepared);
  return client.submitAndWait(signed.tx_blob);
}

export async function sendDirectMintPayment({
  coreVaultXrplAddress,
  recipientAddress,
  amountXrp,
  xrplClient,
  xrplWallet,
}: {
  coreVaultXrplAddress: string;
  recipientAddress: Address;
  amountXrp: number;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const memoData = buildDirectMintingMemo(recipientAddress);

  const transaction = await sendXrplPayment({
    destination: coreVaultXrplAddress,
    amount: amountXrp,
    memos: [{ Memo: { MemoData: memoData } }],
    wallet: xrplWallet,
    client: xrplClient,
  });

  return transaction;
}

export function getXrplTestnetExplorerUrl(txHash: string): string {
  return `https://testnet.xrpl.org/transactions/${txHash}`;
}
