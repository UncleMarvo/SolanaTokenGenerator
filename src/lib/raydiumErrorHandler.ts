import { Connection } from "@solana/web3.js";

/**
 * Production-ready error handling and retry logic for Raydium SDK operations
 */

export interface RaydiumErrorContext {
  operation: string;
  poolId?: string;
  positionNftMint?: string;
  walletPubkey?: string;
  retryCount?: number;
}

export class RaydiumError extends Error {
  public readonly code: string;
  public readonly context: RaydiumErrorContext;
  public readonly retryable: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string,
    context: RaydiumErrorContext,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'RaydiumError';
    this.code = code;
    this.context = context;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}

/**
 * Map Raydium SDK errors to user-friendly messages and retry logic
 */
export function mapRaydiumError(error: any, context: RaydiumErrorContext): RaydiumError {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  // SDK-specific error patterns
  if (errorMessage.includes('Pool not found') || errorMessage.includes('Invalid pool')) {
    return new RaydiumError(
      'CLMM pool not found or invalid',
      'NoPool',
      context,
      false
    );
  }
  
  if (errorMessage.includes('Position not found') || errorMessage.includes('Invalid position')) {
    return new RaydiumError(
      'Position NFT not found or invalid',
      'NoPosition',
      context,
      false
    );
  }
  
  if (errorMessage.includes('Insufficient liquidity')) {
    return new RaydiumError(
      'Insufficient liquidity in pool',
      'InsufficientLiquidity',
      context,
      false
    );
  }
  
  if (errorMessage.includes('Slippage tolerance exceeded')) {
    return new RaydiumError(
      'Price moved beyond slippage tolerance',
      'SlippageExceeded',
      context,
      true // Retryable with fresh quote
    );
  }
  
  if (errorMessage.includes('Blockhash expired') || errorMessage.includes('Transaction expired')) {
    return new RaydiumError(
      'Transaction expired, please retry',
      'BlockhashExpired',
      context,
      true
    );
  }
  
  if (errorMessage.includes('Insufficient funds')) {
    return new RaydiumError(
      'Insufficient token balance',
      'InsufficientFunds',
      context,
      false
    );
  }
  
  if (errorMessage.includes('User rejected') || errorMessage.includes('UserRejected')) {
    return new RaydiumError(
      'Transaction was rejected by user',
      'UserRejected',
      context,
      false
    );
  }
  
  // Network/connection errors (retryable)
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return new RaydiumError(
      'Network error, please retry',
      'NetworkError',
      context,
      true,
      error
    );
  }
  
  // RPC errors (retryable)
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return new RaydiumError(
      'Rate limit exceeded, please retry',
      'RateLimit',
      context,
      true,
      error
    );
  }
  
  // Generic SDK error
  return new RaydiumError(
    'Raydium SDK operation failed',
    'SdkError',
    context,
    true,
    error
  );
}

/**
 * Retry logic for Raydium SDK operations
 */
export async function retryRaydiumOperation<T>(
  operation: () => Promise<T>,
  context: RaydiumErrorContext,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: RaydiumError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const raydiumError = mapRaydiumError(error, { ...context, retryCount: attempt });
      lastError = raydiumError;
      
      // Don't retry if error is not retryable
      if (!raydiumError.retryable) {
        throw raydiumError;
      }
      
      // Don't retry if we've exceeded max retries
      if (attempt >= maxRetries) {
        throw raydiumError;
      }
      
      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Raydium operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, raydiumError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Validate connection health before Raydium operations
 */
export async function validateConnection(connection: Connection): Promise<void> {
  try {
    const slot = await connection.getSlot();
    if (!slot || slot === 0) {
      throw new Error('Invalid slot returned from RPC');
    }
    
    const blockhash = await connection.getLatestBlockhash('finalized');
    if (!blockhash.blockhash) {
      throw new Error('Invalid blockhash returned from RPC');
    }
    
    console.log('Connection validation passed');
  } catch (error) {
    throw new RaydiumError(
      'RPC connection is unhealthy',
      'ConnectionError',
      { operation: 'validateConnection' },
      true,
      error
    );
  }
}

/**
 * Enhanced error logging for production monitoring
 */
export function logRaydiumError(error: RaydiumError): void {
  const logData = {
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      context: error.context
    },
    originalError: error.originalError ? {
      name: error.originalError.name,
      message: error.originalError.message,
      stack: error.originalError.stack
    } : undefined
  };
  
  // Log to console for development
  console.error('Raydium Error:', logData);
  
  // In production, you might want to send this to a monitoring service
  // Example: sendToMonitoringService(logData);
}

/**
 * Get user-friendly error message for UI display
 */
export function getUserFriendlyMessage(error: RaydiumError): string {
  const messages: Record<string, string> = {
    'NoPool': 'This token pair is not available on Raydium CLMM',
    'NoPosition': 'Position not found. It may have been closed or transferred.',
    'InsufficientLiquidity': 'Not enough liquidity in the pool for this operation',
    'SlippageExceeded': 'Price moved too much. Please try again with higher slippage.',
    'BlockhashExpired': 'Transaction expired. Please try again.',
    'InsufficientFunds': 'Insufficient token balance for this operation',
    'UserRejected': 'Transaction was cancelled',
    'NetworkError': 'Network error. Please check your connection and try again.',
    'RateLimit': 'Too many requests. Please wait a moment and try again.',
    'ConnectionError': 'Connection to Solana network failed. Please try again.',
    'SdkError': 'An error occurred with the Raydium integration. Please try again.'
  };
  
  return messages[error.code] || 'An unexpected error occurred. Please try again.';
}

/**
 * Check if an error should trigger automatic retry in the UI
 */
export function shouldAutoRetry(error: RaydiumError): boolean {
  const autoRetryCodes = [
    'SlippageExceeded',
    'BlockhashExpired',
    'NetworkError',
    'RateLimit',
    'ConnectionError'
  ];
  
  return autoRetryCodes.includes(error.code);
}
