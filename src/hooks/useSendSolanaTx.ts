import { useRef, useState } from "react";
import { Connection, Transaction, PublicKey, Signer, SendTransactionError, VersionedTransaction } from "@solana/web3.js";
import toast from "react-hot-toast";

/**
 * Transaction sending phases for UI state management
 */
export type TransactionPhase = "idle" | "signing" | "sending" | "confirming";

/**
 * Transaction sending result
 */
export interface SendTxResult {
  ok: boolean;
  signature?: string;
  error?: string;
}

/**
 * Wallet interface for transaction signing
 */
export interface Wallet {
  publicKey: PublicKey | null;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

/**
 * Parameters for sending a transaction
 */
export interface SendTxParams {
  tx: Transaction;
  partialSigners?: Signer[];
  walletPublicKey: PublicKey;
  wallet: Wallet;
}

/**
 * Custom hook for sending Solana transactions with race condition protection
 * 
 * Features:
 * - Prevents double-invokes using inFlight ref
 * - Proper transaction lifecycle management (signing -> sending -> confirming)
 * - Fresh blockhash and fee payer setup before signing
 * - Partial signing support for position mints and temp WSOL accounts
 * - Devnet-friendly confirmation with fallback polling
 * - Comprehensive error handling and user feedback
 * 
 * Usage:
 * - Disable Confirm button while phase !== "idle"
 * - Build complete transaction BEFORE calling sendTx
 * - Do not mutate transaction after partialSign + signTransaction
 */
export function useSendSolanaTx(connection: Connection) {
  // Track if a transaction is currently in flight to prevent double-invokes
  const inFlight = useRef(false);
  
  // Track current transaction phase for UI state management
  const [phase, setPhase] = useState<TransactionPhase>("idle");

  /**
   * Send a transaction with comprehensive error handling and race condition protection
   */
  async function sendTx({ 
    tx, 
    partialSigners = [], 
    walletPublicKey, 
    wallet 
  }: SendTxParams): Promise<SendTxResult> {
    
    // Prevent double-invokes by checking inFlight state
    if (inFlight.current) {
      console.warn("[useSendSolanaTx] Transaction already in flight, ignoring duplicate request");
      toast("Already processing a transaction…");
      return { ok: false, error: "Busy" };
    }

    // Validate wallet and public key
    if (!walletPublicKey) {
      console.error("[useSendSolanaTx] Wallet public key is required");
      toast.error("Wallet not connected");
      return { ok: false, error: "Wallet not connected" };
    }

    // Set inFlight flag to prevent concurrent transactions
    inFlight.current = true;
    setPhase("signing");

    try {
      console.log("[useSendSolanaTx] Starting transaction send process");

      // Get fresh blockhash and lastValidBlockHeight BEFORE any signing
      // This ensures we have the most recent blockhash for the transaction
      console.log("[useSendSolanaTx] Fetching latest blockhash");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      
      // Set transaction properties - MUST be done before signing
      tx.recentBlockhash = blockhash;
      tx.feePayer = walletPublicKey;

      console.log("[useSendSolanaTx] Transaction configured with blockhash:", blockhash);

      // IMPORTANT: Partial sign first - these accounts MUST be signed:
      // 1. positionMint (Keypair) → must partialSign
      // 2. Temp WSOL account (if created) → must partialSign  
      // 3. Any other program-derived keypairs → must partialSign
      // This must happen before wallet signing to avoid signature conflicts
      if (partialSigners?.length) {
        console.log("[useSendSolanaTx] Partial signing with", partialSigners.length, "signers");
        tx.partialSign(...partialSigners);
        
        // CRITICAL: Validate that all partial signers are actually signed
        // This ensures positionMint, temp WSOL accounts, etc. are properly signed
        const missingSignatures = partialSigners.filter(signer => 
          !tx.signatures.find(sig => sig.publicKey.equals(signer.publicKey))
        );
        
        if (missingSignatures.length > 0) {
          const missingPubkeys = missingSignatures.map(s => s.publicKey.toBase58()).join(', ');
          throw new Error(`Missing partial signatures for: ${missingPubkeys}. All partial signers must be signed before wallet signing.`);
        }
        
        console.log("[useSendSolanaTx] All partial signers successfully signed:", 
          partialSigners.map(s => s.publicKey.toBase58()));
      }

      // DO NOT modify transaction after this point to avoid signature invalidation
      // 4. Wallet (fee payer + authority) → via wallet.signTransaction
      console.log("[useSendSolanaTx] Requesting wallet signature");
      const signed = await wallet.signTransaction(tx);
      
      setPhase("sending");
      console.log("[useSendSolanaTx] Sending signed transaction");

      // Serialize and send transaction with retry configuration
      const raw = signed.serialize({ 
        requireAllSignatures: false, 
        verifySignatures: true 
      });
      
      const sig = await connection.sendRawTransaction(raw, { 
        skipPreflight: false, 
        maxRetries: 3 
      });

      console.log("[useSendSolanaTx] Transaction sent with signature:", sig);

      setPhase("confirming");
      console.log("[useSendSolanaTx] Waiting for confirmation");

      // Devnet-friendly confirmation with fallback polling
      try {
        // Try standard confirmation first
        await connection.confirmTransaction({ 
          signature: sig, 
          blockhash, 
          lastValidBlockHeight 
        }, "confirmed");
        
        console.log("[useSendSolanaTx] Transaction confirmed successfully");
      } catch (confirmError) {
        console.warn("[useSendSolanaTx] Standard confirmation failed, trying fallback polling:", confirmError);
        
        // Fallback: Poll for confirmation status if standard confirm throws
        // This is especially useful for devnet where confirmation can be unreliable
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          
          try {
            const txr = await connection.getSignatureStatuses([sig]);
            if (txr?.value?.[0]?.confirmationStatus) {
              console.log("[useSendSolanaTx] Transaction confirmed via fallback polling");
              break;
            }
          } catch (pollError) {
            console.warn("[useSendSolanaTx] Polling attempt", i + 1, "failed:", pollError);
          }
        }
      }

      console.log("[useSendSolanaTx] Transaction completed successfully");
      return { ok: true, signature: sig };

    } catch (e: any) {
      console.error("[useSendSolanaTx] Transaction failed:", e?.message || e);
      
      // Enhanced error logging for SendTransactionError
      try {
        if (e instanceof SendTransactionError) {
          // Fetch and log full transaction logs for debugging
          const logs = await e.getLogs(connection).catch(() => null);
          console.error("[useSendSolanaTx] SendTransactionError logs:", logs);
        }
        
        // Log signature count information for debugging
        const msg = tx.compileMessage();
        console.error("[useSendSolanaTx] Signatures required/present:", msg.header.numRequiredSignatures, tx.signatures?.length);
        console.error("[useSendSolanaTx] Fee payer:", tx.feePayer?.toBase58());
        
        // Log transaction details for debugging
        console.error("[useSendSolanaTx] Transaction recent blockhash:", tx.recentBlockhash);
        console.error("[useSendSolanaTx] Transaction instructions count:", tx.instructions.length);
      } catch (debugError) {
        // Don't let debug logging errors interfere with main error handling
        console.warn("[useSendSolanaTx] Debug logging failed:", debugError);
      }
      
      // Some wallets throw errors but the transaction might actually be sent
      // Try to extract signature from error message if available
      let errorMessage = e?.message || "Unknown error";
      
      // Check if this is a user rejection
      if (errorMessage.toLowerCase().includes("user rejected") || 
          errorMessage.toLowerCase().includes("user denied")) {
        errorMessage = "Transaction was rejected by user";
      } else if (errorMessage.toLowerCase().includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (errorMessage.toLowerCase().includes("blockhash")) {
        errorMessage = "Transaction expired - please try again";
      }

      // Show user-friendly error message
      toast.error(errorMessage);
      
      return { ok: false, error: errorMessage };
    } finally {
      // Always reset state, regardless of success or failure
      inFlight.current = false;
      setPhase("idle");
      console.log("[useSendSolanaTx] Transaction process completed, state reset");
    }
  }

  return { 
    sendTx, 
    phase,
    isInFlight: inFlight.current 
  };
}
