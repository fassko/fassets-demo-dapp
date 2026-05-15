import { type Address, getAddress, isAddress } from 'viem';

export const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;

export function tryParseFlareRecipient(value: string): Address | null {
  const t = value.trim();
  if (!isAddress(t)) return null;
  try {
    return getAddress(t);
  } catch {
    return null;
  }
}

export function formatFlareAddress(address: string | undefined): string {
  if (!address || address === ZERO_ADDRESS) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function isZeroAddress(address: string | undefined): boolean {
  return !address || address.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}
