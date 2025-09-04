export function mapDexError(e: any) {
  const msg = (e?.message || "").toLowerCase();
  if (msg.includes("blockhash")) return { code:"BlockhashExpired", message:"Network busy, please try again." };
  if (msg.includes("insufficient") || msg.includes("0x1")) return { code:"InsufficientFunds", message:"Insufficient funds for this action." };
  if (msg.includes("user rejected")) return { code:"UserRejected", message:"You cancelled the transaction." };
  if (msg.includes("slippage")) return { code:"Slippage", message:"Slippage too low. Increase and retry." };
  return { code:"Unknown", message:"Transaction failed. Please retry." };
}

/**
 * Maps errors to user-friendly messages for the liquidity wizard
 * Handles specific edge cases with helpful guidance
 * @param e - Error object or message
 * @returns User-friendly error message
 */
export function mapFriendlyError(e: any): string {
  const msg = (e?.message || e || "").toLowerCase();
  
  // Slippage-related errors
  if (msg.includes("slippage") || msg.includes("price impact")) {
    return "Slippage too tight. Try 1–2%.";
  }
  
  // Pool-related errors
  if (msg.includes("no pool") || msg.includes("pool not found") || msg.includes("invalid pool")) {
    return "No pool found yet. Try a different pair or create via commit.";
  }
  
  // Insufficient funds errors
  if (msg.includes("insufficient") || msg.includes("0x1") || msg.includes("balance too low")) {
    return "Balance too low for fees or inputs.";
  }
  
  // Network/connection errors
  if (msg.includes("blockhash") || msg.includes("network") || msg.includes("timeout")) {
    return "Network busy. Please try again.";
  }
  
  // User rejection
  if (msg.includes("user rejected") || msg.includes("cancelled")) {
    return "Transaction cancelled.";
  }
  
  // Default fallback
  return "Something went wrong. Please try again.";
}