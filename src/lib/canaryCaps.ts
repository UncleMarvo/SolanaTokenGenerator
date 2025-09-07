import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getMint, NATIVE_MINT } from "@solana/spl-token";
import { IS_MAINNET, CANARY_MODE, CANARY_MAX_SOL, CANARY_MAX_TOKEN_UI, isAllowedWallet } from "@/lib/canary";

/**
 * Convert UI amounts to base units using mint decimals
 * 
 * For SOL (NATIVE_MINT), uses LAMPORTS_PER_SOL (1e9)
 * For other tokens, fetches on-chain mint decimals and uses 10^decimals
 * 
 * @param conn - Solana connection for fetching mint data
 * @param mintStr - Mint address as base58 string
 * @param uiAmount - UI amount to convert
 * @returns Base units as bigint
 */
export async function uiToBase(conn: Connection, mintStr: string, uiAmount: number): Promise<bigint> {
  // Validate input
  if (!Number.isFinite(uiAmount) || uiAmount < 0) {
    return 0n;
  }

  const mint = new PublicKey(mintStr);
  
  // Handle SOL (native mint) - always use lamports
  if (mint.equals(NATIVE_MINT)) {
    return BigInt(Math.floor(uiAmount * LAMPORTS_PER_SOL));
  }
  
  // Handle other tokens - fetch decimals from on-chain mint account
  try {
    const mintAcc = await getMint(conn, mint);
    const factor = 10 ** mintAcc.decimals;
    return BigInt(Math.floor(uiAmount * factor));
  } catch (error) {
    console.error(`Failed to fetch mint decimals for ${mintStr}:`, error);
    // Fallback to 6 decimals (common for most SPL tokens)
    const factor = 10 ** 6;
    return BigInt(Math.floor(uiAmount * factor));
  }
}

/**
 * Input parameters for canary cap enforcement
 */
export type CanaryInputs = {
  owner: string;        // wallet base58 address
  mintA: string;        // mint A base58 address
  mintB: string;        // mint B base58 address
  uiA?: number;         // UI amount for side A (e.g., SOL or token)
  uiB?: number;         // UI amount for side B
};

/**
 * Enforce mainnet canary caps using base units derived from on-chain mint decimals
 * 
 * This function:
 * 1. Does nothing on devnet (no restrictions)
 * 2. Blocks all commits on mainnet if CANARY_MODE is disabled
 * 3. Only allows allow-listed wallets on mainnet when CANARY_MODE is enabled
 * 4. Enforces amount caps by converting UI amounts to base units using on-chain decimals
 * 
 * @param conn - Solana connection for fetching mint data
 * @param inp - Input parameters including wallet, mints, and UI amounts
 * @throws Error with specific codes for different failure scenarios
 */
export async function enforceCanaryCaps(conn: Connection, inp: CanaryInputs): Promise<void> {
  // Devnet: no restrictions - allow all commits
  if (!IS_MAINNET) {
    return;
  }
  
  // Mainnet: check if canary mode is enabled
  if (!CANARY_MODE) {
    const e: any = new Error("Mainnet commits are disabled. Set CANARY_MODE=1 to enable for allow-listed wallets.");
    e.code = "MainnetDisabled";
    throw e;
  }
  
  // Check if wallet is in allow-list
  if (!isAllowedWallet(inp.owner)) {
    const e: any = new Error("This wallet is not in the mainnet test allow-list.");
    e.code = "WalletNotAllowListed";
    throw e;
  }

  // Convert UI caps to base units using on-chain mint decimals
  const capA_base = await uiToBase(conn, inp.mintA, CANARY_MAX_SOL);
  const capB_base = await uiToBase(conn, inp.mintB, CANARY_MAX_TOKEN_UI);

  // Validate side A amount if provided
  if (typeof inp.uiA === "number") {
    const wantA_base = await uiToBase(conn, inp.mintA, inp.uiA);
    if (wantA_base > capA_base) {
      const e: any = new Error(`Side A amount (${inp.uiA}) exceeds canary limit (${CANARY_MAX_SOL} SOL).`);
      e.code = "CapExceeded";
      e.side = "A";
      throw e;
    }
  }
  
  // Validate side B amount if provided
  if (typeof inp.uiB === "number") {
    const wantB_base = await uiToBase(conn, inp.mintB, inp.uiB);
    if (wantB_base > capB_base) {
      const e: any = new Error(`Side B amount (${inp.uiB}) exceeds canary limit (${CANARY_MAX_TOKEN_UI} tokens).`);
      e.code = "CapExceeded";
      e.side = "B";
      throw e;
    }
  }
}
