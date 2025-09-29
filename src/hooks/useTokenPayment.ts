import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TokenCreationType } from "../lib/tokenPricing";

// Token payment response type
interface TokenPaymentResponse {
  ok: boolean;
  verified?: boolean;
  tokenType?: string;
  paidAmount?: number;
  requiredAmount?: number;
  error?: string;
  message?: string;
}

// Hook return type
interface UseTokenPaymentReturn {
  isVerifying: boolean;
  error: string | null;
  verifyTokenPayment: (txSig: string, tokenType: TokenCreationType) => Promise<boolean>;
}

export const useTokenPayment = (): UseTokenPaymentReturn => {
  const { publicKey } = useWallet();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify token creation payment
  const verifyTokenPayment = useCallback(async (
    txSig: string, 
    tokenType: TokenCreationType
  ): Promise<boolean> => {
    if (!publicKey) {
      setError("No wallet connected");
      return false;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const response = await fetch("/api/token/payment-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          txSig,
          tokenType
        }),
      });

      const result: TokenPaymentResponse = await response.json();

      if (result.ok && result.verified) {
        return true;
      } else {
        setError(result.message || result.error || "Payment verification failed");
        return false;
      }
    } catch (err: any) {
      console.error("Error verifying token payment:", err);
      setError("Network error while verifying payment");
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [publicKey]);

  return {
    isVerifying,
    error,
    verifyTokenPayment
  };
};
