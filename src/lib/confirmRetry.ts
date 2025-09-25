import { Connection } from "@solana/web3.js";
import { DEV_RELAX_CONFIRM_MS } from "@/lib/env";

/**
 * Retry a read function with exponential backoff
 * Total budget is DEV_RELAX_CONFIRM_MS (0 disables retry)
 * 
 * This utility helps handle slow devnet confirmations by retrying
 * read operations that might fail due to network latency or
 * temporary unavailability of transaction data.
 * 
 * @param fn - Function to retry that returns a Promise<T>
 * @returns Promise<T> - Result of the function call
 * @throws The last error encountered if all retries fail
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
  const budget = DEV_RELAX_CONFIRM_MS;
  
  // If budget is 0 or undefined, disable retry and call function once
  if (!budget) {
    return fn();
  }
  
  const t0 = Date.now();
  let delay = 500; // Start with 500ms delay
  let lastErr: any;
  
  // Retry within the time budget
  while (Date.now() - t0 < budget) {
    try {
      // Attempt the function call
      return await fn();
    } catch (e) {
      // Store the error for potential re-throwing
      lastErr = e;
      
      // Check if we have time for another retry
      const timeLeft = budget - (Date.now() - t0);
      if (timeLeft <= delay) {
        break;
      }
      
      // Wait before next retry with exponential backoff
      await new Promise(r => setTimeout(r, delay));
      
      // Increase delay for next retry, capped at 4 seconds
      delay = Math.min(delay * 2, 4000);
    }
  }
  
  // If we've exhausted the budget, throw the last error or a timeout error
  throw lastErr ?? new Error("Retry timeout exceeded");
}
