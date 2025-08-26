// XRP (XRP Ledger) utility functions
// Shared functions for XRP client management, balance fetching, and ledger operations
import { Client } from 'xrpl';

// XRP Ledger connection configuration
export const XRP_CONFIG = {
  TESTNET_URL: 'wss://s.altnet.rippletest.net:51233',
  DROPS_PER_XRP: 1000000, // 1 XRP = 1,000,000 drops
  FDC_LEDGER_CONFIRMATION: 225, // Number of ledgers for FDC confirmation
  FDC_TIMESTAMP_OFFSET: 946684800, // Ripple epoch to UNIX epoch conversion
  FDC_TIMESTAMP_BUFFER: 900, // 15 minutes buffer for FDC deadline
} as const;

// XRP Ledger data types
export interface XRPLedgerInfo {
  ledgerIndex: number;
  closeTime: number;
}

export interface XRPAccountInfo {
  balance: string; // Balance in drops
  balanceInXRP: string; // Balance in XRP
}

export interface XRPFDCDeadline {
  deadlineBlockNumber: string;
  deadlineTimestamp: string;
}

// Internal client management
let xrpClient: Client | null = null;

// Initialize XRP client connection (internal)
const getXRPClient = async (): Promise<Client> => {
  if (!xrpClient) {
    try {
      xrpClient = new Client(XRP_CONFIG.TESTNET_URL);
      await xrpClient.connect();
      console.log('XRP client connected successfully');
    } catch (error) {
      console.error('Error initializing XRP connection:', error);
      throw new Error('Failed to connect to XRP Ledger');
    }
  }
  return xrpClient;
};

// Get latest ledger information
export const getLatestLedgerInfo = async (): Promise<XRPLedgerInfo> => {
  try {
    console.log('Fetching latest XRP ledger info...');

    const client = await getXRPClient();
    const ledgerInfo = await client.request({
      command: 'ledger',
      ledger_index: 'validated',
    });

    console.log('Latest ledger info:', ledgerInfo);

    return {
      ledgerIndex: ledgerInfo.result.ledger_index,
      closeTime: ledgerInfo.result.ledger.close_time,
    };
  } catch (error) {
    console.error('Error fetching ledger info:', error);
    throw new Error('Failed to fetch XRP ledger information');
  }
};

// Get account balance
export const getAccountBalance = async (
  address: string
): Promise<XRPAccountInfo> => {
  try {
    console.log(`Fetching XRP balance for address: ${address}`);

    const client = await getXRPClient();
    const accountInfo = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    });

    const balanceInDrops = accountInfo.result.account_data.Balance;
    const balanceInXRP = (
      parseFloat(balanceInDrops) / XRP_CONFIG.DROPS_PER_XRP
    ).toString();

    console.log(`Balance: ${balanceInXRP} XRP (${balanceInDrops} drops)`);

    return {
      balance: balanceInDrops,
      balanceInXRP,
    };
  } catch (error) {
    console.error('Error fetching XRP balance:', error);
    throw new Error('Failed to fetch XRP account balance');
  }
};

// Calculate FDC deadline values from ledger info
export const calculateFDCDeadline = (
  ledgerInfo: XRPLedgerInfo
): XRPFDCDeadline => {
  const { ledgerIndex, closeTime } = ledgerInfo;

  // Calculate FDC deadline values
  // L = latest validated ledger_index
  // T_ripple = that ledger's close_time (Ripple epoch seconds)
  const L = ledgerIndex;
  const T_ripple = closeTime;

  // deadlineBlockNumber = L + 225 (≈ 225 ledgers of confirmation)
  const deadlineBlockNumber = L + XRP_CONFIG.FDC_LEDGER_CONFIRMATION;

  // deadlineTimestamp = (T_ripple + 946684800) + 900
  // (add 946,684,800 to convert Ripple→UNIX, then add ~15 minutes for 3 ledgers)
  const deadlineTimestamp =
    T_ripple +
    XRP_CONFIG.FDC_TIMESTAMP_OFFSET +
    XRP_CONFIG.FDC_TIMESTAMP_BUFFER;

  console.log('FDC deadline calculations:');
  console.log('- Latest ledger index:', L);
  console.log('- Latest close time:', T_ripple);
  console.log('- FDC deadline block number:', deadlineBlockNumber);
  console.log('- FDC deadline timestamp:', deadlineTimestamp);

  return {
    deadlineBlockNumber: deadlineBlockNumber.toString(),
    deadlineTimestamp: deadlineTimestamp.toString(),
  };
};

// Get latest ledger info and calculate FDC deadlines
export const getLatestLedgerInfoWithFDCDeadlines = async (): Promise<{
  ledgerInfo: XRPLedgerInfo;
  fdcDeadlines: XRPFDCDeadline;
}> => {
  const ledgerInfo = await getLatestLedgerInfo();
  const fdcDeadlines = calculateFDCDeadline(ledgerInfo);

  return {
    ledgerInfo,
    fdcDeadlines,
  };
};

// Validate XRP address format
export const isValidXRPAddress = (address: string): boolean => {
  // Basic XRP address validation
  // XRP addresses start with 'r' and are typically 25-35 characters long
  return (
    address.startsWith('r') && address.length >= 25 && address.length <= 35
  );
};

// Convert drops to XRP
export const dropsToXRP = (drops: string | number): string => {
  const dropsNum = typeof drops === 'string' ? parseFloat(drops) : drops;
  return (dropsNum / XRP_CONFIG.DROPS_PER_XRP).toString();
};

// Convert XRP to drops
export const xrpToDrops = (xrp: string | number): string => {
  const xrpNum = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  return (xrpNum * XRP_CONFIG.DROPS_PER_XRP).toString();
};
