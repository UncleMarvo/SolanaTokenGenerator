/**
 * DEPRECATED: Wallet-based Pro status hook
 * 
 * This hook is deprecated and will be removed in a future version.
 * Use the new per-token payment system instead:
 * - useTokenProStatus() - For token-based Pro validation
 * - useProPaymentSession() - For session-based payment validation
 * 
 * Migration guide:
 * 1. Replace useProStatus() with useTokenProStatus()
 * 2. Pass tokenMint instead of relying on wallet
 * 3. Use session-based validation for token creation flow
 */

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// Pro status response type
interface ProStatusResponse {
  ok: boolean;
  isPro: boolean;
  wallet?: string;
  expiresAt?: string | null;
  error?: string;
  message?: string;
}

// Hook return type
interface UseProStatusReturn {
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  checkProStatus: () => Promise<void>;
  refreshProStatus: () => Promise<void>;
}

export const useProStatus = (): UseProStatusReturn => {
  console.warn("⚠️ DEPRECATED: useProStatus() is deprecated. Use useTokenProStatus() from useTokenProStatus.ts instead");
  
  const { publicKey } = useWallet();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check Pro status for the connected wallet
  const checkProStatus = useCallback(async () => {
    if (!publicKey) {
      setIsPro(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/me/isPro?wallet=${publicKey.toString()}`);
      const result: ProStatusResponse = await response.json();

      if (result.ok) {
        setIsPro(result.isPro);
      } else {
        setError(result.message || result.error || "Failed to check Pro status");
        setIsPro(false);
      }
    } catch (err: any) {
      console.error("Error checking Pro status:", err);
      setError("Network error while checking Pro status");
      setIsPro(false);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  // Refresh Pro status (same as check but more explicit naming)
  const refreshProStatus = useCallback(async () => {
    await checkProStatus();
  }, [checkProStatus]);

  // Check Pro status when wallet changes
  useEffect(() => {
    checkProStatus();
  }, [checkProStatus]);

  return {
    isPro,
    isLoading,
    error,
    checkProStatus,
    refreshProStatus
  };
};
