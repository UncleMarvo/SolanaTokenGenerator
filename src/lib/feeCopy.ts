/**
 * Fee display helper functions
 * Reads fee values from environment variables to ensure accuracy
 */

/**
 * Gets the current fee configuration for display purposes
 * @returns Object containing flat fee and skim percentage
 */
export function feeSummaryText() {
  // Get flat fee from environment (defaults to 0.02 SOL)
  const flat = process.env.NEXT_PUBLIC_LAUNCH_FLAT_FEE_SOL || "0.02";
  
  // Get skim percentage in basis points (defaults to 200 bps = 2%)
  const skimBp = process.env.NEXT_PUBLIC_LAUNCH_SKIM_BP || "200";
  
  // Convert basis points to percentage for display
  const skimPct = (Number(skimBp) / 100).toFixed(2);
  
  return { flat, skimPct };
}

/**
 * Gets fee configuration for server-side use (without NEXT_PUBLIC_ prefix)
 * @returns Object containing flat fee and skim percentage
 */
export function feeSummaryTextServer() {
  // Get flat fee from environment (defaults to 0.02 SOL)
  const flat = process.env.LAUNCH_FLAT_FEE_SOL || "0.02";
  
  // Get skim percentage in basis points (defaults to 200 bps = 2%)
  const skimBp = process.env.LAUNCH_SKIM_BP || "200";
  
  // Convert basis points to percentage for display
  const skimPct = (Number(skimBp) / 100).toFixed(2);
  
  return { flat, skimPct };
}
