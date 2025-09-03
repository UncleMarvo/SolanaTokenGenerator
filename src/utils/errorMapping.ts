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
