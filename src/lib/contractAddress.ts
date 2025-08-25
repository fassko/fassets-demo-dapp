/**
 * Utility functions for contract address extraction
 */

/**
 * Extract contract address from Flare contract registry response
 * Handles both string and object response formats from getAddress() calls
 *
 * @param addressResult - Result from contract.getAddress(provider) call
 * @returns Properly formatted Ethereum address
 * @throws Error if address format is invalid
 */
export function extractContractAddress(addressResult: unknown): `0x${string}` {
  if (typeof addressResult === 'string') {
    return addressResult as `0x${string}`;
  } else if (
    addressResult &&
    typeof addressResult === 'object' &&
    'data' in addressResult
  ) {
    return (addressResult as { data: string }).data as `0x${string}`;
  } else {
    throw new Error('Invalid address format returned from getAddress');
  }
}
