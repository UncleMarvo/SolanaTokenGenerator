import { PublicKey } from "@solana/web3.js";

/**
 * Canary Mode Configuration
 * 
 * On mainnet, DEX commits are blocked by default for safety.
 * When CANARY_MODE=1, only allow-listed wallets can commit with amount caps.
 * Devnet behavior is unchanged (no restrictions).
 */

export const IS_MAINNET = process.env.NETWORK === "mainnet";
export const CANARY_MODE = process.env.CANARY_MODE === "1";
export const CANARY_WALLETS = (process.env.CANARY_WALLETS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
export const CANARY_MAX_SOL = Number(process.env.CANARY_MAX_SOL || 0.02);
export const CANARY_MAX_TOKEN_UI = Number(process.env.CANARY_MAX_TOKEN_UI || 50);

/**
 * Check if a wallet is in the canary allow-list
 */
export function isAllowedWallet(pubkey: string): boolean {
  return CANARY_WALLETS.includes(pubkey);
}

/**
 * Enforce canary rules on mainnet: allow-list + amount caps (per side)
 * 
 * @param params - Validation parameters
 * @param params.owner - Wallet base58 address
 * @param params.sideAUi - UI amount for side A (e.g., SOL)
 * @param params.sideBUi - UI amount for side B (token UI units)
 * @param params.mintA - Token mint A base58 address
 * @param params.mintB - Token mint B base58 address
 * 
 * @throws Error with specific codes:
 * - "MainnetDisabled" - Mainnet commits are disabled
 * - "WalletNotAllowListed" - Wallet not in allow-list
 * - "CapExceeded" - Amount exceeds canary limits
 */
export function assertCanaryAllowed(params: {
  owner: string;                   // wallet base58
  sideAUi?: number;                // UI amount (e.g., SOL)
  sideBUi?: number;                // UI amount (token UI units)
  mintA?: string;                  // base58
  mintB?: string;
}): void {
  // Devnet: no restrictions
  if (!IS_MAINNET) return;
  
  // Mainnet: check if canary mode is enabled
  if (!CANARY_MODE) {
    const e: any = new Error("Mainnet commits are disabled. Set CANARY_MODE=1 to enable for allow-listed wallets.");
    e.code = "MainnetDisabled";
    throw e;
  }
  
  // Check if wallet is in allow-list
  if (!isAllowedWallet(params.owner)) {
    const e: any = new Error("This wallet is not in the mainnet test allow-list.");
    e.code = "WalletNotAllowListed";
    throw e;
  }
  
  // Enforce amount caps per side (best-effort UI checks; server still uses precise base units later)
  if (params.sideAUi !== undefined && params.sideAUi > CANARY_MAX_SOL) {
    const e: any = new Error(`Side A amount (${params.sideAUi}) exceeds canary limit (${CANARY_MAX_SOL} SOL).`);
    e.code = "CapExceeded";
    throw e;
  }
  
  if (params.sideBUi !== undefined && params.sideBUi > CANARY_MAX_TOKEN_UI) {
    const e: any = new Error(`Side B amount (${params.sideBUi}) exceeds canary limit (${CANARY_MAX_TOKEN_UI} tokens).`);
    e.code = "CapExceeded";
    throw e;
  }
}

/**
 * Get canary mode status for client-side display
 */
export function getCanaryStatus() {
  return {
    isMainnet: IS_MAINNET,
    canaryMode: CANARY_MODE,
    maxSol: CANARY_MAX_SOL,
    maxTokenUi: CANARY_MAX_TOKEN_UI,
    allowListedWallets: CANARY_WALLETS.length
  };
}
