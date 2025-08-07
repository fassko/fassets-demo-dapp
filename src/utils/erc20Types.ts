// Import OpenZeppelin ERC20 interface types
export interface IERC20 {
  // View functions
  balanceOf(account: string): Promise<bigint>;
  decimals(): Promise<number>;
  
  // State-changing functions
  transfer(to: string, amount: bigint): Promise<boolean>;
  
  // Events
  Transfer: (from: string, to: string, value: bigint) => void;
  Approval: (owner: string, spender: string, value: bigint) => void;
}

// ERC20 ABI for use with ethers.js
export const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
] as const; 