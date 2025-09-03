import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Connection, Transaction, PublicKey } from "@solana/web3.js";

export interface LiquidityForm {
  tokenMint: string;
  dex: "Raydium" | "Orca";
  pair: "SOL/TOKEN" | "USDC/TOKEN";
  baseAmount: string;
  quoteAmount: string;
  slippageBp?: number;
}

export interface LiquidityQuote {
  poolAddress: string;
  priceImpactBp: number;
  lpFeeBp: number;
  expectedLpTokens: string;
  minOut: string;
  quoteId: string;
  source: "Raydium" | "DexScreener" | "Orca"; // Source of the quote data
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
    
    setIsCommitting(true);
    setErrorMsg(null);
    
    try {
      // Add whirlpool info for Orca
      const requestBody = {
        ...form,
        quoteId: quote.quoteId,
        ...(form.dex === "Orca" && {
          whirlpool: quote.poolAddress,
          slippageBp: 100 // Default 1% slippage
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
        throw new Error(errorData.error || "Failed to commit liquidity");
      }

      const data = await response.json();
      
      if (form.dex === "Orca" && data.txBase64) {
        // For Orca, we need to sign and send the transaction
        await signAndSendOrcaTransaction(data.txBase64, data.summary);
      } else if (form.dex === "Raydium" && data.txid) {
        // For Raydium, just show the result
        setCommitResult(data);
        setShowConfirmModal(false);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error committing liquidity:", error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to commit liquidity");
    } finally {
      setIsCommitting(false);
    }
  };

  const signAndSendOrcaTransaction = async (txBase64: string, summary: any) => {
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

      // Initialize connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
      );

      // Deserialize transaction
      const transaction = Transaction.from(Buffer.from(txBase64, 'base64'));
      
      // Set fee payer and recent blockhash
      transaction.feePayer = wallet.publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign and send transaction
      const signedTx = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");
      
      // Save transaction metadata for LP chips
      try {
        await fetch("/api/positions/saveTx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint: form.tokenMint,
            txid: signature,
            whirlpool: summary.whirlpool,
            tickLower: summary.tickLower,
            tickUpper: summary.tickUpper
          })
        });
      } catch (error) {
        console.warn("Failed to save transaction metadata:", error);
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

  return {
    currentStep,
    form,
    quote,
    errorMsg,
    isLoading,
    isCommitting,
    showConfirmModal,
    commitResult,
    updateForm,
    nextStep,
    prevStep,
    getQuote,
    commitLiquidity,
    setShowConfirmModal,
    resetWizard,
    goBackFromQuote
  };
};
