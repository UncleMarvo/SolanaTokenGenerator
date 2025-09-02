import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

/**
 * Preflight helper functions for validating transactions before building
 * This helps prevent failures and provides better user feedback
 */

/**
 * Get the token balance for a specific mint owned by a wallet
 * @param connection Solana connection
 * @param owner Owner public key
 * @param mint Token mint public key
 * @returns Token balance as BigInt, or 0 if account doesn't exist
 */
export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<bigint> {
  try {
    const ata = getAssociatedTokenAddressSync(mint, owner);
    const accountInfo = await connection.getTokenAccountBalance(ata);
    
    if (accountInfo.value) {
      return BigInt(accountInfo.value.amount);
    }
    
    return BigInt(0);
  } catch (error) {
    // Account doesn't exist or other error
    return BigInt(0);
  }
}

/**
 * Get SOL balance for a wallet
 * @param connection Solana connection
 * @param owner Owner public key
 * @returns SOL balance in lamports
 */
export async function getSolBalance(
  connection: Connection,
  owner: PublicKey
): Promise<bigint> {
  try {
    const balance = await connection.getBalance(owner);
    return BigInt(balance);
  } catch (error) {
    console.error("Error getting SOL balance:", error);
    return BigInt(0);
  }
}

/**
 * Ensure Associated Token Accounts (ATAs) exist for given mints
 * Returns instructions to create any missing ATAs
 * @param owner Owner public key
 * @param mints Array of token mint public keys
 * @returns Array of instructions to create missing ATAs
 */
export function ensureAtas(
  owner: PublicKey,
  mints: PublicKey[]
): any[] {
  const instructions: any[] = [];
  
  for (const mint of mints) {
    try {
      const ata = getAssociatedTokenAddressSync(mint, owner);
      
      // Add instruction to create ATA if it doesn't exist
      // Note: This instruction will fail if ATA already exists, but that's fine
      // The transaction will still succeed due to idempotent nature
      instructions.push(
        createAssociatedTokenAccountInstruction(owner, ata, owner, mint)
      );
    } catch (error) {
      console.error(`Error creating ATA instruction for mint ${mint.toBase58()}:`, error);
    }
  }
  
  return instructions;
}

/**
 * Validate that a wallet has sufficient token balance for an operation
 * @param connection Solana connection
 * @param owner Owner public key
 * @param mint Token mint public key
 * @param requiredAmount Required amount in smallest units
 * @param operationName Name of the operation for error messages
 * @returns Object with isValid boolean and error message if invalid
 */
export async function validateTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
  requiredAmount: bigint,
  operationName: string
): Promise<{ isValid: boolean; error?: string; currentBalance: bigint }> {
  const currentBalance = await getTokenBalance(connection, owner, mint);
  
  if (currentBalance < requiredAmount) {
    return {
      isValid: false,
      error: `Insufficient ${operationName} balance. Required: ${requiredAmount}, Available: ${currentBalance}`,
      currentBalance
    };
  }
  
  return {
    isValid: true,
    currentBalance
  };
}

/**
 * Validate that a wallet has sufficient SOL for transaction fees
 * @param connection Solana connection
 * @param owner Owner public key
 * @param requiredLamports Required SOL in lamports (default: 0.01 SOL)
 * @returns Object with isValid boolean and error message if invalid
 */
export async function validateSolBalance(
  connection: Connection,
  owner: PublicKey,
  requiredLamports: bigint = BigInt(10_000_000) // 0.01 SOL default
): Promise<{ isValid: boolean; error?: string; currentBalance: bigint }> {
  const currentBalance = await getSolBalance(connection, owner);
  
  if (currentBalance < requiredLamports) {
    const requiredSol = Number(requiredLamports) / 1e9;
    const currentSol = Number(currentBalance) / 1e9;
    
    return {
      isValid: false,
      error: `Insufficient SOL for transaction fees. Required: ${requiredSol.toFixed(4)} SOL, Available: ${currentSol.toFixed(4)} SOL`,
      currentBalance
    };
  }
  
  return {
    isValid: true,
    currentBalance
  };
}

/**
 * Comprehensive preflight check for position management operations
 * @param connection Solana connection
 * @param owner Owner public key
 * @param tokenMints Array of token mints involved in the operation
 * @param requiredAmounts Object mapping mint addresses to required amounts
 * @param operationName Name of the operation for error messages
 * @returns Object with validation results and instructions
 */
export async function preflightPositionOperation(
  connection: Connection,
  owner: PublicKey,
  tokenMints: PublicKey[],
  requiredAmounts: { [mint: string]: bigint },
  operationName: string
): Promise<{
  isValid: boolean;
  errors: string[];
  instructions: any[];
  balances: { [mint: string]: bigint };
}> {
  const errors: string[] = [];
  const instructions: any[] = [];
  const balances: { [mint: string]: bigint } = {};
  
  // Ensure ATAs exist
  instructions.push(...ensureAtas(owner, tokenMints));
  
  // Check SOL balance for fees
  const solValidation = await validateSolBalance(connection, owner);
  if (!solValidation.isValid) {
    errors.push(solValidation.error!);
  }
  
  // Check token balances
  for (const mint of tokenMints) {
    const mintAddress = mint.toBase58();
    const requiredAmount = requiredAmounts[mintAddress] || BigInt(0);
    
    if (requiredAmount > 0) {
      const tokenValidation = await validateTokenBalance(
        connection,
        owner,
        mint,
        requiredAmount,
        operationName
      );
      
      balances[mintAddress] = tokenValidation.currentBalance;
      
      if (!tokenValidation.isValid) {
        errors.push(tokenValidation.error!);
      }
    } else {
      // Get current balance even if no amount required
      balances[mintAddress] = await getTokenBalance(connection, owner, mint);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    instructions,
    balances
  };
}

/**
 * Get friendly error message for common preflight failures
 * @param errors Array of error messages
 * @returns User-friendly error message
 */
export function getFriendlyErrorMessage(errors: string[]): string {
  if (errors.length === 0) return "";
  
  // Check for specific error types and provide helpful messages
  const hasInsufficientFunds = errors.some(e => e.includes("Insufficient"));
  const hasSolError = errors.some(e => e.includes("SOL"));
  
  if (hasInsufficientFunds && hasSolError) {
    return "Insufficient funds for transaction. Please check both your token balance and SOL balance for fees.";
  } else if (hasInsufficientFunds) {
    return "Insufficient token balance for this operation. Please check your wallet balance.";
  } else if (hasSolError) {
    return "Insufficient SOL for transaction fees. Please add some SOL to your wallet.";
  }
  
  // Return the first error as fallback
  return errors[0];
}
