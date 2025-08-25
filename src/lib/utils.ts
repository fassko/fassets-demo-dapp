import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a string to a hex representation padded to 64 characters
 * @param data - The string to convert to hex
 * @returns A hex string prefixed with "0x" and padded to 64 characters
 */
export function toHex(data: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += data.charCodeAt(i).toString(16);
  }
  return '0x' + result.padEnd(64, '0');
}
