import { Transaction } from "@solana/web3.js";

/**
 * Client-side transaction sending utility with automatic retry on blockhash expiry
 * Handles common Solana transaction errors and retries with fresh blockhash
 */

export interface SendWithRetryOptions {
  maxRetries?: number;        // Maximum retry attempts (default: 1)
  retryDelay?: number;        // Delay between retries in ms (default: 1000)
}

/**
 * Send a transaction with automatic retry on blockhash expiry
 * @param build - Function that builds and returns transaction data
 * @param wallet - Wallet instance for signing and sending
 * @param connection - Solana connection instance
 * @param options - Retry configuration options
 * @returns Promise<string> - Transaction signature
 */
export async function sendWithRetry(
  build: () => Promise<{ txBase64: string }>, 
  wallet: any, 
  connection: any,
  options: SendWithRetryOptions = {}
): Promise<string> {
  const { maxRetries = 1, retryDelay = 1000 } = options;
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Build transaction
      const { txBase64 } = await build();
      const tx = Transaction.from(Buffer.from(txBase64, "base64"));
      
      // Send transaction
      const sig = await wallet.sendTransaction(tx, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(sig, "confirmed");
      
      console.log(`Transaction sent successfully on attempt ${attempt + 1}:`, sig);
      return sig;
      
    } catch (e: any) {
      lastError = e;
      const msg = (e?.message || "").toLowerCase();
      
      // Check if this is a blockhash/expiry error that warrants retry
      const isRetryableError = msg.includes("blockhash") || 
                               msg.includes("transaction expired") ||
                               msg.includes("blockhash not found");
      
      if (isRetryableError && attempt < maxRetries) {
        console.log(`Attempt ${attempt + 1} failed with retryable error:`, e?.message);
        console.log(`Retrying in ${retryDelay}ms...`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      // Non-retryable error or max retries reached
      break;
    }
  }
  
  // All attempts failed
  console.error(`Transaction failed after ${maxRetries + 1} attempts:`, lastError?.message);
  throw lastError;
}
