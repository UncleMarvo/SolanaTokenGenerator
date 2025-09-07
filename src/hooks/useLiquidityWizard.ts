import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Connection, Transaction, PublicKey } from "@solana/web3.js";
import { logPending, logSuccess, logError } from "../utils/actionLogger";
import { DEV_RELAX_CONFIRM_MS } from "../lib/env";
import { useSendSolanaTx } from "./useSendSolanaTx";

export interface LiquidityForm {
  tokenMint: string;
  dex: "Raydium" | "Orca";
  pair: "SOL/TOKEN" | "USDC/TOKEN";
  baseAmount: string;
  quoteAmount: string;
  slippageBp?: number;
  selectedPool?: string; // Manual pool selection for devnet
}

export interface LiquidityQuote {
  poolAddress: string;
  priceImpactBp: number;
  lpFeeBp: number;
  expectedLpTokens: string;
  minOut: string;
  quoteId: string;
  source: "Raydium" | "DexScreener" | "Orca"; // Source of the quote data
  // CLMM-specific fields for enhanced quotes
  clmmPoolId?: string;
  tickLower?: number;
  tickUpper?: number;
  tokenAIn?: string;
  tokenBIn?: string;
  estLiquidity?: string;
}

export interface LiquidityError {
  error: string;
  message?: string;
  details?: string[];
}

export interface LiquidityCommit {
  txid?: string; // For Raydium (mocked)
  txBase64?: string; // For Orca (base64 encoded)
  summary?: {
    whirlpool: string;
    tokenMintA: string;
    tokenMintB: string;
    inputMint: "A" | "B";
    inputAmountUi: string;
    expectedOutputAmountUi: string;
    slippageBp: number;
    tickLower: number;
    tickUpper: number;
    currentTick: number;
    tickSpacing: number;
    signature?: string; // Transaction signature after confirmation
  };
}

export const useLiquidityWizard = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<LiquidityForm>({
    tokenMint: "",
    dex: "Raydium",
    pair: "SOL/TOKEN",
    baseAmount: "",
    quoteAmount: "",
    slippageBp: 100
  });
  const [quote, setQuote] = useState<LiquidityQuote | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [commitResult, setCommitResult] = useState<LiquidityCommit | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  // Initialize connection and transaction sending hook
  const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
  );
  const { sendTx, phase, isInFlight } = useSendSolanaTx(connection);

  // Update form when URL parameters are available
  useEffect(() => {
    if (router.isReady) {
      const tokenMint = router.query.tokenMint as string;
      const dex = router.query.dex as "Raydium" | "Orca";
      const pair = router.query.pair as "SOL/TOKEN" | "USDC/TOKEN";
      
      if (tokenMint || dex || pair) {
        setForm(prev => ({
          ...prev,
          tokenMint: tokenMint || prev.tokenMint,
          dex: dex || prev.dex,
          pair: pair || prev.pair
        }));
      }
    }
  }, [router.isReady, router.query.tokenMint, router.query.dex, router.query.pair]);

  const updateForm = (field: keyof LiquidityForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getQuote = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setQuote(null);
    
    // Create AbortController with 15 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch("/api/liquidity/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = "Quote failed";
        
        // Handle specific error types
        if (errorData.error === "InvalidRequest") {
          if (errorData.details && errorData.details.length > 0) {
            errorMessage = `Invalid request: ${errorData.details.join(", ")}`;
          } else {
            errorMessage = errorData.message || "Invalid request";
          }
        } else if (errorData.error === "NoPool") {
          errorMessage = errorData.message || "No pool available for this pair";
        } else if (errorData.error === "ProviderError") {
          errorMessage = errorData.message || "DEX API error";
        } else if (errorData.error === "Timeout") {
          errorMessage = errorData.message || "Request timeout";
        } else if (errorData.error === "ResponseTooLarge") {
          errorMessage = errorData.message || "Response too large";
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        setErrorMsg(errorMessage);
        return;
      }

      const data = await response.json();
      setQuote(data);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setErrorMsg("Timeout fetching quote");
        } else {
          setErrorMsg("Network error - please check your connection");
        }
      } else {
        setErrorMsg("Unexpected error occurred");
      }
      
      console.error("Error getting quote:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const commitLiquidity = async () => {
    if (!quote) return;
    
    const startTime = Date.now();
    const action = `Commit ${form.dex} Liquidity`;
    const amount = `${form.baseAmount} ${form.pair.split('/')[0]}`;
    
    setIsCommitting(true);
    setErrorMsg(null);
    
    // Log pending action
    logPending({
      action,
      dex: form.dex,
      tokenMint: form.tokenMint,
      amount
    });
    
    try {
      // Get wallet address for canary validation
      let walletAddress = "11111111111111111111111111111111"; // Default placeholder
      if (typeof window !== "undefined" && window.solana?.isPhantom && window.solana.publicKey) {
        walletAddress = window.solana.publicKey.toString();
      }

      // Add required parameters for each DEX
      const requestBody = {
        ...form,
        quoteId: quote.quoteId,
        owner: walletAddress, // Include wallet address for canary validation
        ...(form.dex === "Orca" && {
          whirlpool: quote.poolAddress,
          slippageBp: 100 // Default 1% slippage
        }),
        ...(form.dex === "Raydium" && form.pair === "USDC/TOKEN" && {
          clmmPoolId: quote.clmmPoolId || quote.poolAddress, // Use CLMM pool ID if available, fallback to pool address
          slippageBp: 100, // Default 1% slippage
          // NEW: Pass tick boundaries from quote to ensure consistency
          tickLower: quote.tickLower,
          tickUpper: quote.tickUpper
        })
      };

      const response = await fetch("/api/liquidity/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData.error || "ProviderError";
        const errorMessage = errorData.message || "Failed to commit liquidity";
        
        // Log error with structured data
        logError({
          action,
          dex: form.dex,
          tokenMint: form.tokenMint,
          amount,
          errorCode,
          errorMessage,
          duration: Date.now() - startTime
        });
        
        // Set structured error for UI display
        setErrorMsg(`${errorCode}: ${errorMessage}`);
        return;
      }

      const data = await response.json();
      
      if (form.dex === "Orca" && data.txBase64) {
        // For Orca, we need to sign and send the transaction
        await signAndSendOrcaTransaction(data.txBase64, data.summary, data.partialSigners);
        
        // Log success only after successful transaction
        logSuccess({
          action,
          dex: form.dex,
          tokenMint: form.tokenMint,
          amount,
          txSignature: data.summary?.signature || 'pending',
          duration: Date.now() - startTime
        });
      } else if (form.dex === "Raydium" && data.txBase64) {
        // For Raydium CLMM, we need to sign and send the transaction (same as Orca)
        await signAndSendRaydiumClmmTransaction(data.txBase64, data.summary, data.partialSigners);
        
        // Log success only after successful transaction
        logSuccess({
          action,
          dex: form.dex,
          tokenMint: form.tokenMint,
          amount,
          txSignature: data.summary?.signature || 'pending',
          duration: Date.now() - startTime
        });
      } else if (form.dex === "Raydium" && data.txid) {
        // For Raydium AMM (legacy), just show the result
        setCommitResult(data);
        setShowConfirmModal(false);
        
        // Log success for legacy Raydium
        logSuccess({
          action,
          dex: form.dex,
          tokenMint: form.tokenMint,
          amount,
          txSignature: data.txid || 'pending',
          duration: Date.now() - startTime
        });
      } else {
        throw new Error("Invalid response format");
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to commit liquidity";
      
      // Log error
      logError({
        action,
        dex: form.dex,
        tokenMint: form.tokenMint,
        amount,
        errorCode: "ProviderError",
        errorMessage,
        duration
      });
      
      console.error("Error committing liquidity:", error);
      setErrorMsg(errorMessage);
    } finally {
      setIsCommitting(false);
    }
  };

  const signAndSendOrcaTransaction = async (txBase64: string, summary: any, partialSigners?: string[]) => {
    try {
      // Check if wallet is available
      if (typeof window === 'undefined' || !window.solana?.isPhantom) {
        throw new Error("Phantom wallet not found. Please install Phantom wallet.");
      }

      const wallet = window.solana;
      
      // Connect wallet if not connected
      if (!wallet.isConnected) {
        await wallet.connect();
      }

      // Deserialize transaction
      const transaction = Transaction.from(Buffer.from(txBase64, 'base64'));
      
      // Check if this is a devnet test transaction with placeholder data
      // If so, skip actual signing and simulate success for testing
      const isDevnetTest = process.env.NEXT_PUBLIC_NETWORK === 'devnet' && 
                          summary.whirlpool?.startsWith('orca_devnet_');
      
      if (isDevnetTest) {
        console.log("Devnet test mode: Simulating successful Orca transaction");
        
        // Simulate a successful transaction signature for testing
        const mockSignature = "devnet_test_" + Date.now().toString(36);
        
        // Show success result without actual blockchain interaction
        setCommitResult({
          txBase64,
          summary: {
            ...summary,
            signature: mockSignature
          }
        });
        setShowConfirmModal(false);
        return;
      }
      
      // Validate wallet public key before sending transaction
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected or public key not available");
      }

      // Convert partial signers from base64 to Keypair objects if provided
      let partialSignerKeypairs: any[] = [];
      if (partialSigners && partialSigners.length > 0) {
        try {
          const { Keypair } = await import("@solana/web3.js");
          partialSignerKeypairs = partialSigners.map(signerBase64 => 
            Keypair.fromSecretKey(new Uint8Array(Buffer.from(signerBase64, 'base64')))
          );
          console.log("Converted", partialSignerKeypairs.length, "partial signers from base64");
        } catch (error) {
          console.warn("Failed to convert partial signers:", error);
        }
      }

      // Use the new transaction sending hook with race condition protection
      console.log("Sending Orca transaction using protected sendTx hook");
      const result = await sendTx({
        tx: transaction,
        partialSigners: partialSignerKeypairs,
        walletPublicKey: wallet.publicKey,
        wallet: {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction
        }
      });

      if (!result.ok) {
        throw new Error(result.error || "Transaction failed");
      }

      const signature = result.signature!;
      console.log("Orca transaction sent successfully:", signature);
      
      // Notify transaction to database
      try {
        await fetch("/api/tx/notify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            txSig: signature,
            wallet: wallet.publicKey.toString(),
            mint: form.tokenMint,
            dex: "orca",
            context: {
              poolId: summary.whirlpool,
              positionMint: summary.whirlpool, // For Orca, using whirlpool as position identifier
              tickLower: summary.tickLower,
              tickUpper: summary.tickUpper,
              tokenA: form.tokenMint,
              tokenB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
              decA: 6, // Default token decimals (adjust as needed)
              decB: 6, // USDC decimals
              lastLiquidity: "0", // New position
              action: "commit",
              // NEW: Include fee information for admin tracking
              ...(summary.fee && {
                action: "skim",
                skimBp: summary.fee.skimBp,
                skimA: summary.fee.skimA,
                skimB: summary.fee.skimB,
                flatSol: summary.fee.sol
              })
            }
          })
        });
      } catch (error) {
        console.warn("Failed to notify transaction:", error);
      }
      
      // Show success result
      setCommitResult({
        txBase64,
        summary: {
          ...summary,
          signature
        }
      });
      setShowConfirmModal(false);
      
    } catch (error) {
      console.error("Error signing/sending Orca transaction:", error);
      
      // Close the modal on error so user can see the error message
      setShowConfirmModal(false);
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          setErrorMsg("Transaction was rejected by user");
        } else if (error.message.includes("insufficient funds")) {
          setErrorMsg("Insufficient funds for transaction");
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setErrorMsg("Failed to sign and send transaction");
      }
    }
  };

  const signAndSendRaydiumClmmTransaction = async (txBase64: string, summary: any, partialSigners?: string[]) => {
    try {
      // Check if wallet is available
      if (typeof window === 'undefined' || !window.solana?.isPhantom) {
        throw new Error("Phantom wallet not found. Please install Phantom wallet.");
      }

      const wallet = window.solana;
      
      // Connect wallet if not connected
      await wallet.connect();

      // Deserialize transaction
      const transaction = Transaction.from(Buffer.from(txBase64, 'base64'));
      
      // Check if this is a devnet test transaction with placeholder data
      // If so, skip actual signing and simulate success for testing
      const isDevnetTest = process.env.NEXT_PUBLIC_NETWORK === 'devnet' && 
                          summary.clmmPoolId?.startsWith('raydium_devnet_');
      
      if (isDevnetTest) {
        console.log("Devnet test mode: Simulating successful Raydium CLMM transaction");
        
        // Simulate a successful transaction signature for testing
        const mockSignature = "devnet_test_" + Date.now().toString(36);
        
        // Show success result without actual blockchain interaction
        setCommitResult({
          txBase64,
          summary: {
            ...summary,
            signature: mockSignature
          }
        });
        setShowConfirmModal(false);
        return;
      }
      
      // Validate wallet public key before sending transaction
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected or public key not available");
      }

      // Convert partial signers from base64 to Keypair objects if provided
      let partialSignerKeypairs: any[] = [];
      if (partialSigners && partialSigners.length > 0) {
        try {
          const { Keypair } = await import("@solana/web3.js");
          partialSignerKeypairs = partialSigners.map(signerBase64 => 
            Keypair.fromSecretKey(new Uint8Array(Buffer.from(signerBase64, 'base64')))
          );
          console.log("Converted", partialSignerKeypairs.length, "partial signers from base64");
        } catch (error) {
          console.warn("Failed to convert partial signers:", error);
        }
      }

      // Use the new transaction sending hook with race condition protection
      console.log("Sending Raydium CLMM transaction using protected sendTx hook");
      const result = await sendTx({
        tx: transaction,
        partialSigners: partialSignerKeypairs,
        walletPublicKey: wallet.publicKey,
        wallet: {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction
        }
      });

      if (!result.ok) {
        throw new Error(result.error || "Transaction failed");
      }

      const signature = result.signature!;
      console.log("Raydium CLMM transaction sent successfully:", signature);
      
      // Notify transaction to database
      try {
        await fetch("/api/tx/notify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            txSig: signature,
            wallet: wallet.publicKey.toString(),
            mint: form.tokenMint,
            dex: "raydium",
            context: {
              poolId: summary.clmmPoolId,
              positionMint: summary.clmmPoolId, // For MVP, using poolId as position NFT
              tickLower: summary.tickLower,
              tickUpper: summary.tickUpper,
              tokenA: form.tokenMint,
              tokenB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
              decA: 6, // Default token decimals (adjust as needed)
              decB: 6, // USDC decimals
              lastLiquidity: "0", // New position
              action: "commit",
              // NEW: Include fee information for admin tracking
              ...(summary.fee && {
                action: "skim",
                skimBp: summary.fee.skimBp,
                skimA: summary.fee.skimA,
                skimB: summary.fee.skimB,
                flatSol: summary.fee.sol
              })
            }
          })
        });
      } catch (error) {
        console.warn("Failed to notify transaction:", error);
      }
      
      // Show success result
      setCommitResult({
        txBase64,
        summary: {
          ...summary,
          signature
        }
      });
      setShowConfirmModal(false);
      
    } catch (error) {
      console.error("Error signing/sending Raydium CLMM transaction:", error);
      
      // Close the modal on error so user can see the error message
      setShowConfirmModal(false);
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          setErrorMsg("Transaction was rejected by user");
        } else if (error.message.includes("insufficient funds")) {
          setErrorMsg("Insufficient funds for transaction");
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setErrorMsg("Failed to sign and send transaction");
      }
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setQuote(null);
    setErrorMsg(null);
    setCommitResult(null);
    setShowConfirmModal(false);
  };

  const goBackFromQuote = () => {
    setQuote(null);
    setErrorMsg(null);
    prevStep();
  };

  const setSelectedPool = (poolAddress: string) => {
    setForm(prev => ({ ...prev, selectedPool: poolAddress }));
  };

  return {
    currentStep,
    form,
    quote,
    errorMsg,
    isLoading,
    isCommitting,
    showConfirmModal,
    commitResult,
    // Transaction phase information for UI state management
    txPhase: phase,
    isTxInFlight: isInFlight,
    updateForm,
    nextStep,
    prevStep,
    getQuote,
    commitLiquidity,
    setShowConfirmModal,
    resetWizard,
    goBackFromQuote,
    setSelectedPool
  };
};
