import { useState, useEffect, useCallback } from "react";

/**
 * Hook for checking Pro status based on token tier instead of wallet
 * Replaces useProStatus for per-token payment model
 */

interface TokenProStatusResponse {
  isPro: boolean;
  tier: string;
  paymentVerified: boolean;
  error?: string;
}

interface UseTokenProStatusReturn {
  isPro: boolean;
  tier: string;
  paymentVerified: boolean;
  isLoading: boolean;
  error: string | null;
  checkTokenProStatus: (tokenMint: string) => Promise<void>;
  refreshTokenProStatus: (tokenMint: string) => Promise<void>;
}

export const useTokenProStatus = (): UseTokenProStatusReturn => {
  const [isPro, setIsPro] = useState(false);
  const [tier, setTier] = useState('free');
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check Pro status for a specific token
  const checkTokenProStatus = useCallback(async (tokenMint: string) => {
    if (!tokenMint) {
      setIsPro(false);
      setTier('free');
      setPaymentVerified(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/token/pro-status?mint=${tokenMint}`);
      const result: TokenProStatusResponse = await response.json();

      if (result.isPro !== undefined) {
        setIsPro(result.isPro);
        setTier(result.tier || 'free');
        setPaymentVerified(result.paymentVerified || false);
      } else {
        setError(result.error || "Failed to check token Pro status");
        setIsPro(false);
        setTier('free');
        setPaymentVerified(false);
      }
    } catch (err: any) {
      console.error("Error checking token Pro status:", err);
      setError("Network error while checking token Pro status");
      setIsPro(false);
      setTier('free');
      setPaymentVerified(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh Pro status (same as check but more explicit naming)
  const refreshTokenProStatus = useCallback(async (tokenMint: string) => {
    await checkTokenProStatus(tokenMint);
  }, [checkTokenProStatus]);

  return {
    isPro,
    tier,
    paymentVerified,
    isLoading,
    error,
    checkTokenProStatus,
    refreshTokenProStatus
  };
};

/**
 * Hook for session-based Pro payment validation
 * Used during token creation flow to validate payment session
 */
interface UseProPaymentSessionReturn {
  hasValidPayment: boolean;
  paymentSession: any;
  clearPaymentSession: () => void;
  refreshPaymentSession: () => void;
}

export const useProPaymentSession = (): UseProPaymentSessionReturn => {
  const [hasValidPayment, setHasValidPayment] = useState(false);
  const [paymentSession, setPaymentSession] = useState<any>(null);

  const refreshPaymentSession = useCallback(() => {
    try {
      const stored = localStorage.getItem('pro_token_payment');
      if (stored) {
        const session = JSON.parse(stored);
        
        // Check if session is still valid (within 10 minutes)
        const now = Date.now();
        const sessionAge = now - session.timestamp;
        const maxSessionAge = 10 * 60 * 1000; // 10 minutes
        
        if (sessionAge <= maxSessionAge && session.paymentConfirmed) {
          setPaymentSession(session);
          setHasValidPayment(true);
        } else {
          // Session expired
          localStorage.removeItem('pro_token_payment');
          setPaymentSession(null);
          setHasValidPayment(false);
        }
      } else {
        setPaymentSession(null);
        setHasValidPayment(false);
      }
    } catch (error) {
      console.error('Error refreshing payment session:', error);
      setPaymentSession(null);
      setHasValidPayment(false);
    }
  }, []);

  const clearPaymentSession = useCallback(() => {
    localStorage.removeItem('pro_token_payment');
    setPaymentSession(null);
    setHasValidPayment(false);
  }, []);

  // Check payment session on mount
  useEffect(() => {
    refreshPaymentSession();
  }, [refreshPaymentSession]);

  return {
    hasValidPayment,
    paymentSession,
    clearPaymentSession,
    refreshPaymentSession
  };
};
