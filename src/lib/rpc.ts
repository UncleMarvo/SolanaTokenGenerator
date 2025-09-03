import { Connection } from "@solana/web3.js";

// RPC endpoint configuration with environment variables
const PRIMARY = process.env.RPC_PRIMARY!;
const FALLBACK = process.env.RPC_FALLBACK || PRIMARY;

/**
 * Get a Solana connection instance for the specified preference
 * @param pref - Connection preference: "primary" or "fallback"
 * @returns Solana Connection instance
 */
export function getConnection(pref: "primary"|"fallback" = "primary") {
  const url = pref === "primary" ? PRIMARY : FALLBACK;
  return new Connection(url, "confirmed");
}

/**
 * Helper function to run operations on primary RPC with automatic fallback
 * Attempts primary first, falls back to secondary on network errors
 * @param fn - Function to execute with Connection instance
 * @returns Promise<T> - Result of the operation
 */
export async function withRpc<T>(fn: (c: Connection)=>Promise<T>): Promise<T> {
  const primary = getConnection("primary");
  try { 
    return await fn(primary); 
  }
  catch (e:any) { 
    const msg = (e?.message||"").toLowerCase();
    // Fallback on network-related errors (fetch failures, connection issues, timeouts)
    if (msg.includes("fetch") || msg.includes("econn") || msg.includes("timed out")) {
      console.log("Primary RPC failed, falling back to secondary:", e?.message);
      const fb = getConnection("fallback");
      return await fn(fb);
    }
    // Re-throw non-network errors
    throw e; 
  }
}
