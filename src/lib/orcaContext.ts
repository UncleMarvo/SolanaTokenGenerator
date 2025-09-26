import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Orca Context Wrapper
 * Handles RPC interface compatibility between @solana/web3.js and @orca-so/whirlpools SDK
 * Provides graceful error handling and fallback mechanisms
 */

export interface OrcaContextError {
  code: string;
  message: string;
  details?: any;
}

export class OrcaContextManager {
  private connection: Connection;
  private isInitialized: boolean = false;
  private lastError: OrcaContextError | null = null;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Initialize Orca context with graceful error handling
   */
  async initialize(): Promise<{ success: boolean; error?: OrcaContextError }> {
    try {
      // Clear previous errors
      this.lastError = null;

      // For Orca SDK v3.0.0, we don't need a complex context
      // The SDK functions work directly with the connection
      this.isInitialized = true;
      console.log("Orca context initialized successfully");
      
      return { success: true };
    } catch (error) {
      const orcaError: OrcaContextError = {
        code: "ORCA_CONTEXT_INIT_FAILED",
        message: "Failed to initialize Orca context",
        details: error
      };
      
      this.lastError = orcaError;
      console.error("Orca context initialization failed:", error);
      
      return { success: false, error: orcaError };
    }
  }

  /**
   * Get the Orca context with error handling
   */
  getContext(): { context: Connection; error?: OrcaContextError } {
    if (!this.isInitialized) {
      const error: OrcaContextError = {
        code: "ORCA_CONTEXT_NOT_INITIALIZED",
        message: "Orca context not initialized. Call initialize() first.",
        details: this.lastError
      };
      
      return { context: this.connection, error };
    }

    return { context: this.connection };
  }

  /**
   * Check if context is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get last error
   */
  getLastError(): OrcaContextError | null {
    return this.lastError;
  }

  /**
   * Reset context (useful for reconnection scenarios)
   */
  async reset(): Promise<{ success: boolean; error?: OrcaContextError }> {
    this.isInitialized = false;
    this.lastError = null;
    
    return await this.initialize();
  }
}

/**
 * Create and initialize Orca context with comprehensive error handling
 */
export async function createOrcaContext(connection: Connection): Promise<{
  context: Connection;
  error?: OrcaContextError;
  manager: OrcaContextManager;
}> {
  const manager = new OrcaContextManager(connection);
  
  try {
    const initResult = await manager.initialize();
    
    if (!initResult.success) {
      return {
        context: connection,
        error: initResult.error,
        manager
      };
    }

    const { context, error } = manager.getContext();
    
    return {
      context,
      error,
      manager
    };
  } catch (error) {
    const orcaError: OrcaContextError = {
      code: "ORCA_CONTEXT_CREATION_FAILED",
      message: "Failed to create Orca context",
      details: error
    };
    
    return {
      context: connection,
      error: orcaError,
      manager
    };
  }
}

/**
 * Safe wrapper for Orca SDK operations with comprehensive error handling
 */
export async function safeOrcaOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallback?: () => T
): Promise<{
  result: T | null;
  error: OrcaContextError | null;
  usedFallback: boolean;
}> {
  try {
    const result = await operation();
    return {
      result,
      error: null,
      usedFallback: false
    };
  } catch (error) {
    console.error(`Orca operation '${operationName}' failed:`, error);
    
    const orcaError: OrcaContextError = {
      code: `ORCA_${operationName.toUpperCase()}_FAILED`,
      message: `Orca operation '${operationName}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };

    // Try fallback if provided
    if (fallback) {
      try {
        const fallbackResult = fallback();
        console.log(`Using fallback for '${operationName}'`);
        return {
          result: fallbackResult,
          error: orcaError, // Still report the original error
          usedFallback: true
        };
      } catch (fallbackError) {
        console.error(`Fallback for '${operationName}' also failed:`, fallbackError);
      }
    }

    return {
      result: null,
      error: orcaError,
      usedFallback: false
    };
  }
}

/**
 * Validate whirlpool address with graceful error handling
 */
export function validateWhirlpoolAddress(address: string): {
  valid: boolean;
  publicKey?: PublicKey;
  error?: string;
} {
  try {
    const publicKey = new PublicKey(address);
    return {
      valid: true,
      publicKey
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid whirlpool address: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate position parameters with comprehensive checks
 */
export function validatePositionParams(params: {
  whirlpool: string;
  positionMint?: string;
  tickLower?: number;
  tickUpper?: number;
  [key: string]: any;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate whirlpool address
  const whirlpoolValidation = validateWhirlpoolAddress(params.whirlpool);
  if (!whirlpoolValidation.valid) {
    errors.push(whirlpoolValidation.error || "Invalid whirlpool address");
  }

  // Validate position mint if provided
  if (params.positionMint) {
    try {
      new PublicKey(params.positionMint);
    } catch (error) {
      errors.push(`Invalid position mint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate tick range if provided
  if (params.tickLower !== undefined && params.tickUpper !== undefined) {
    if (params.tickLower >= params.tickUpper) {
      errors.push("Tick lower must be less than tick upper");
    }
    if (params.tickLower < -443636 || params.tickUpper > 443636) {
      errors.push("Tick values must be within valid range (-443636 to 443636)");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
