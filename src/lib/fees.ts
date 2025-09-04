import { PublicKey } from "@solana/web3.js";

/**
 * Centralized fee configuration for token launches
 * 
 * This module centralizes all fee-related configuration and calculations:
 * - Fee wallet address for receiving launch fees
 * - Flat fee amount in SOL required for token launches
 * - Skim basis points for liquidity skimming during launch
 * - Utility functions for fee calculations
 */

// Fee wallet configuration
// Uses LAUNCH_FEE_WALLET if set, otherwise falls back to FEE_WALLET
export const FEE_WALLET = new PublicKey(
  process.env.LAUNCH_FEE_WALLET || process.env.FEE_WALLET || ""
);

// Flat fee configuration for token launches
// Amount in SOL required upfront for launching a token
// Defaults to 0 if not configured
export const FLAT_FEE_SOL = Math.max(
  0, 
  Number(process.env.LAUNCH_FLAT_FEE_SOL || 0)
);

// Skim basis points configuration
// Percentage of liquidity to skim during launch (1% = 100 basis points)
// Capped at 10,000 bps (100%) for safety, defaults to 0 if not configured
export const SKIM_BP = Math.min(
  10_000, 
  Math.max(0, Number(process.env.LAUNCH_SKIM_BP || 0))
);

/**
 * Applies skim basis points to an amount and returns net and skim amounts
 * 
 * @param amount - The original amount in base units (e.g., lamports for SOL)
 * @returns Object containing net amount (after skim) and skim amount
 * 
 * @example
 * // For 1000 lamports with 200 bps (2%) skim:
 * // applySkimBp(1000n) returns { net: 980n, skim: 20n }
 */
export function applySkimBp(amount: bigint) {
  // If no skim is configured, return full amount with zero skim
  if (SKIM_BP <= 0) {
    return { net: amount, skim: BigInt(0) };
  }
  
  // Calculate skim amount using basis points (1 bps = 0.01%)
  // Formula: (amount * SKIM_BP) / 10,000
  const skim = (amount * BigInt(SKIM_BP)) / BigInt(10000);
  
  // Calculate net amount (original minus skim)
  const net = amount - skim;
  
  return { net, skim };
}

/**
 * Converts SOL amount to lamports (base units)
 * 
 * @param solAmount - Amount in SOL (e.g., 0.1)
 * @returns Amount in lamports (1 SOL = 1,000,000,000 lamports)
 */
export function solToLamports(solAmount: number): bigint {
  return BigInt(Math.floor(solAmount * 1_000_000_000));
}

/**
 * Converts lamports to SOL amount
 * 
 * @param lamports - Amount in lamports
 * @returns Amount in SOL with 9 decimal places
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000;
}

/**
 * Gets the flat fee amount in lamports
 * 
 * @returns Flat fee amount in lamports (base units)
 */
export function getFlatFeeLamports(): bigint {
  return solToLamports(FLAT_FEE_SOL);
}

/**
 * Validates fee configuration
 * 
 * @returns Object indicating if configuration is valid and any warnings
 */
export function validateFeeConfig() {
  const warnings: string[] = [];
  
  // Check if fee wallet is configured
  if (!process.env.LAUNCH_FEE_WALLET && !process.env.FEE_WALLET) {
    warnings.push("No fee wallet configured - launches may fail");
  }
  
  // Check if flat fee is reasonable
  if (FLAT_FEE_SOL > 1) {
    warnings.push("Flat fee is high (>1 SOL) - consider reducing for user experience");
  }
  
  // Check if skim percentage is reasonable
  if (SKIM_BP > 1000) {
    warnings.push("Skim percentage is high (>10%) - consider reducing for user experience");
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    config: {
      feeWallet: FEE_WALLET.toString(),
      flatFeeSol: FLAT_FEE_SOL,
      skimBp: SKIM_BP
    }
  };
}
