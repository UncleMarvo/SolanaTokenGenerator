// Standardized error type for consistent UI error handling
export type UiError = { code: string; message: string };

/**
 * Comprehensive error normalizer that maps common RPC/DEX errors to clear user messages
 * Returns consistent {code, message} format for all error types
 * @param e - Error object, message string, or any error-like value
 * @returns Standardized UiError with code and user-friendly message
 */
export function normalizeError(e: any): UiError {
  const raw = (e?.message || e?.toString?.() || "").toLowerCase();

  // Wallet / signature errors
  if (raw.includes("signature verification failure")) return { code: "SigVerify", message: "Signature verification failed. Make sure your wallet is unlocked and try again." };
  if (raw.includes("user rejected") || raw.includes("transaction was rejected")) return { code: "UserReject", message: "You rejected the transaction in your wallet." };

  // Funds / rent / ATA errors
  if (raw.includes("insufficient funds") || raw.includes("insufficient lamports")) return { code: "NoFunds", message: "Not enough SOL to cover fees/rent. Top up and retry." };
  if (raw.includes("0x1") && raw.includes("program") && !raw.includes("custom program error")) return { code: "NoFunds", message: "Insufficient funds for this action." };

  // Accounts / ATAs errors
  if (raw.includes("invalid account data") || raw.includes("owner does not match")) return { code: "AccountOwner", message: "A required token account is owned by another wallet. Refresh and try again." };
  if (raw.includes("account not initialized") || raw.includes("uninitialized")) return { code: "Uninitialized", message: "A required token account isn't initialized. We'll create it automatically—please retry." };

  // Slippage / price errors
  if (raw.includes("slippage") || raw.includes("price") || raw.includes("sqrtpricelimit")) return { code: "Slippage", message: "Price moved too much (slippage). Increase slippage or reduce amount." };

  // Network / congestion errors
  if (raw.includes("blockhash not found")) return { code: "StaleBlockhash", message: "Network was busy. Retrying usually fixes this." };
  if (raw.includes("too many requests") || raw.includes("rate limit")) return { code: "RateLimited", message: "RPC is rate-limited. Wait a few seconds and try again." };

  // Program generic errors
  if (raw.includes("custom program error")) return { code: "ProgramError", message: "A program rejected the transaction. Try a smaller amount or different pool." };

  return { code: "Unknown", message: "Something went wrong. Please try again." };
}

// Legacy function - kept for backward compatibility but now uses normalizeError
export function mapDexError(e: any) {
  const normalized = normalizeError(e);
  // Map new codes to legacy codes for backward compatibility
  const legacyCodeMap: Record<string, string> = {
    "SigVerify": "UserRejected",
    "UserReject": "UserRejected", 
    "NoFunds": "InsufficientFunds",
    "AccountOwner": "InvalidAccount",
    "Uninitialized": "InvalidAccount",
    "Slippage": "Slippage",
    "StaleBlockhash": "BlockhashExpired",
    "RateLimited": "ProviderError",
    "ProgramError": "ProviderError",
    "Unknown": "Unknown"
  };
  
  return { 
    code: legacyCodeMap[normalized.code] || "Unknown", 
    message: normalized.message 
  };
}

/**
 * Maps errors to user-friendly messages for the liquidity wizard
 * Handles specific edge cases with helpful guidance
 * @param e - Error object or message
 * @returns User-friendly error message
 */
export function mapFriendlyError(e: any): string {
  // Use the new normalizeError function for consistency
  return normalizeError(e).message;
}