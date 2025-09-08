/**
 * Error mapping utility for CLMM operations
 * Maps error codes to user-friendly messages and solutions
 */

export interface ErrorInfo {
  title: string;
  message: string;
  solution: string;
  severity: 'info' | 'warning' | 'error';
}

export const ERROR_MAP: Record<string, ErrorInfo> = {
  // Legacy error codes (kept for backward compatibility)
  NoPool: {
    title: "No Pool Found",
    message: "No Raydium CLMM pool available for this token pair",
    solution: "Try a different token or check if the pool exists on Raydium",
    severity: 'warning'
  },
  InsufficientFunds: {
    title: "Insufficient Funds",
    message: "Your wallet doesn't have enough tokens for this transaction",
    solution: "Check your wallet balance and ensure you have enough SOL for fees",
    severity: 'error'
  },
  SlippageTooLow: {
    title: "Slippage Too Low",
    message: "Slippage tolerance is outside the allowed range",
    solution: "Increase slippage to 0.1% or higher (max 5%)",
    severity: 'warning'
  },
  UserRejected: {
    title: "Transaction Rejected",
    message: "You rejected the transaction in your wallet",
    solution: "Approve the transaction in your Phantom wallet to continue",
    severity: 'info'
  },
  BlockhashExpired: {
    title: "Transaction Expired",
    message: "The transaction blockhash has expired",
    solution: "The system will automatically retry with a fresh blockhash",
    severity: 'warning'
  },
  ProviderError: {
    title: "Network Error",
    message: "A network or provider error occurred",
    solution: "Check your internet connection and try again",
    severity: 'error'
  },
  InvalidAccount: {
    title: "Invalid Account",
    message: "One or more accounts in the transaction are invalid",
    solution: "Refresh the page and try again",
    severity: 'error'
  },
  InvalidInstruction: {
    title: "Invalid Transaction",
    message: "The transaction instruction data is invalid",
    solution: "Refresh the page and try again",
    severity: 'error'
  },
  
  // New standardized error codes from normalizeError
  SigVerify: {
    title: "Signature Verification Failed",
    message: "Signature verification failed. Make sure your wallet is unlocked and try again.",
    solution: "Unlock your wallet and ensure it's properly connected",
    severity: 'error'
  },
  UserReject: {
    title: "Transaction Rejected",
    message: "You rejected the transaction in your wallet.",
    solution: "Approve the transaction in your wallet to continue",
    severity: 'info'
  },
  NoFunds: {
    title: "Insufficient Funds",
    message: "Not enough SOL to cover fees/rent. Top up and retry.",
    solution: "Add more SOL to your wallet for transaction fees",
    severity: 'error'
  },
  AccountOwner: {
    title: "Account Ownership Issue",
    message: "A required token account is owned by another wallet. Refresh and try again.",
    solution: "Refresh the page to reload account information",
    severity: 'error'
  },
  Uninitialized: {
    title: "Account Not Initialized",
    message: "A required token account isn't initialized. We'll create it automatically—please retry.",
    solution: "Retry the transaction - the system will create the required account",
    severity: 'warning'
  },
  Slippage: {
    title: "Slippage Too High",
    message: "Price moved too much (slippage). Increase slippage or reduce amount.",
    solution: "Increase slippage tolerance or reduce the transaction amount",
    severity: 'warning'
  },
  StaleBlockhash: {
    title: "Network Busy",
    message: "Network was busy. Retrying usually fixes this.",
    solution: "The system will automatically retry with a fresh blockhash",
    severity: 'warning'
  },
  RateLimited: {
    title: "Rate Limited",
    message: "RPC is rate-limited. Wait a few seconds and try again.",
    solution: "Wait a few seconds before trying again",
    severity: 'warning'
  },
  ProgramError: {
    title: "Program Error",
    message: "A program rejected the transaction. Try a smaller amount or different pool.",
    solution: "Try reducing the amount or using a different liquidity pool",
    severity: 'error'
  },
  Unknown: {
    title: "Unknown Error",
    message: "Something went wrong. Please try again.",
    solution: "Try the operation again or refresh the page",
    severity: 'error'
  }
};

/**
 * Get error information for a given error code
 */
export function getErrorInfo(errorCode: string): ErrorInfo {
  return ERROR_MAP[errorCode] || ERROR_MAP.ProviderError;
}

/**
 * Get all error codes for debugging
 */
export function getAllErrorCodes(): string[] {
  return Object.keys(ERROR_MAP);
}

/**
 * Check if an error code is retryable
 */
export function isRetryableError(errorCode: string): boolean {
  return ['BlockhashExpired', 'ProviderError'].includes(errorCode);
}

/**
 * Get retry message for an error
 */
export function getRetryMessage(errorCode: string): string | null {
  if (errorCode === 'BlockhashExpired') {
    return 'Automatically retrying with fresh blockhash...';
  }
  if (errorCode === 'ProviderError') {
    return 'You can try again in a few moments';
  }
  return null;
}
