import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { buildCloseWsolTx, readWsolSolBalance, WSOL_DUST_SOL } from "@/lib/wsolGuard";
import { toastError, toastOk } from "./toast";

/**
 * WsolDustBanner - Detects small WSOL leftovers and offers one-click cleanup
 * 
 * Features:
 * - Automatically detects WSOL dust below threshold (default: 0.01 SOL)
 * - Shows banner only when dust is detected
 * - One-click "Unwrap & close WSOL" action
 * - Uses wallet adapter for signing/submitting transactions
 * - Provides user feedback via toast notifications
 */
export default function WsolDustBanner() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // Check WSOL balance when wallet connects or changes
  useEffect(() => {
    let alive = true;
    
    const checkBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }
      
      try {
        const b = await readWsolSolBalance(connection, publicKey);
        if (alive) {
          setBalance(b);
        }
      } catch (error) {
        console.warn("Failed to check WSOL balance:", error);
        if (alive) {
          setBalance(null);
        }
      }
    };

    checkBalance();
    
    return () => { 
      alive = false; 
    };
  }, [connection, publicKey?.toBase58()]);

  // Show banner only if:
  // - Wallet is connected
  // - WSOL balance exists and is > 0
  // - Balance is below dust threshold
  const show = publicKey && 
               typeof balance === "number" && 
               balance > 0 && 
               balance < WSOL_DUST_SOL;

  /**
   * Handle WSOL account closure
   * - Builds close transaction
   * - Signs with wallet
   * - Sends and confirms transaction
   * - Refreshes balance
   * - Shows success/error feedback
   */
  async function onClose() {
    if (!publicKey || !signTransaction) {
      toastError("Wallet not connected or signing not available");
      return;
    }
    
    setLoading(true);
    
    try {
      // Build the close transaction
      const tx = await buildCloseWsolTx(connection, publicKey);
      
      // Sign the transaction
      const signed = await signTransaction(tx);
      
      // Send and confirm the transaction
      const sig = await connection.sendRawTransaction(signed.serialize(), { 
        skipPreflight: false, 
        maxRetries: 3 
      });
      
      await connection.confirmTransaction(sig, "confirmed");
      
      // Refresh balance after successful close
      const newBalance = await readWsolSolBalance(connection, publicKey).catch(() => null);
      setBalance(newBalance);
      
      // Show success message
      toastOk("WSOL account closed successfully! SOL returned to your wallet.");
      
    } catch (error: any) {
      console.error("Failed to close WSOL account:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to close WSOL account";
      
      if (error?.message) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was rejected by user";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction";
        } else if (error.message.includes("Account not found")) {
          errorMessage = "WSOL account not found or already closed";
        } else {
          errorMessage = error.message;
        }
      }
      
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // Don't render if conditions aren't met
  if (!show) return null;

  return (
    <div className="card p-4 mt-4 border border-yellow-500/30 bg-yellow-500/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="h4 text-yellow-400">WSOL dust detected</div>
          <p className="small text-muted">
            You have ~{balance?.toFixed(6)} WSOL left. Unwrap it to return SOL and close the token account.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={onClose} 
          disabled={loading}
        >
          {loading ? "Closing…" : "Unwrap & close WSOL"}
        </button>
      </div>
      <p className="tiny text-neutral-400 mt-2">
        Threshold: {WSOL_DUST_SOL} SOL (configurable via WSOL_DUST_SOL env var).
      </p>
    </div>
  );
}
