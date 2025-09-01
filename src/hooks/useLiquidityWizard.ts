import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export interface LiquidityForm {
  tokenMint: string;
  dex: "Raydium" | "Orca";
  pair: "SOL/TOKEN" | "USDC/TOKEN";
  baseAmount: string;
  quoteAmount: string;
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
  txid: string;
}

export const useLiquidityWizard = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<LiquidityForm>({
    tokenMint: "",
    dex: "Raydium",
    pair: "SOL/TOKEN",
    baseAmount: "",
    quoteAmount: ""
  });
  const [quote, setQuote] = useState<LiquidityQuote | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [commitResult, setCommitResult] = useState<LiquidityCommit | null>(null);

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

  const updateForm = (field: keyof LiquidityForm, value: string) => {
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
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/liquidity/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          quoteId: quote.quoteId
        }),
      });

      const data = await response.json();
      setCommitResult(data);
      setShowConfirmModal(false);
    } catch (error) {
      console.error("Error committing liquidity:", error);
    } finally {
      setIsLoading(false);
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
