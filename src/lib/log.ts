/**
 * Structured action logging utility for tracking DEX operations
 * Provides consistent logging format for debugging and monitoring
 */

export interface ActionLogEntry {
  when?: number;           // Timestamp (auto-filled if not provided)
  action: string;          // Action type: "commit", "increase", "decrease", "collect"
  dex?: string;            // DEX name: "raydium", "orca"
  mint?: string;           // Token mint address
  poolId?: string;         // Pool identifier
  wallet?: string;         // Wallet public key (shortened for privacy)
  ms?: number;             // Execution time in milliseconds
  ok?: boolean;            // Success/failure status
  code?: string;           // Error code if applicable
  msg?: string;            // Error message if applicable
}

/**
 * Log a structured action entry to console
 * @param entry - Action log entry with operation details
 */
export function logAction(entry: ActionLogEntry) {
  const rec = { 
    when: Date.now(), 
    ...entry 
  };
  
  // Shorten wallet address for privacy in logs
  if (rec.wallet && rec.wallet.length > 8) {
    rec.wallet = `${rec.wallet.slice(0, 4)}...${rec.wallet.slice(-4)}`;
  }
  
  console.log("[action]", JSON.stringify(rec));
}
