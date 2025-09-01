import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { verifyHonestMint } from "../lib/solanaToken";

interface UseHonestLaunchVerificationProps {
  mintAddress: string | null;
  preset: "honest" | "degen";
  autoCheck?: boolean; // Whether to automatically check verification on mount
}

export const useHonestLaunchVerification = ({
  mintAddress,
  preset,
  autoCheck = true,
}: UseHonestLaunchVerificationProps) => {
  const { connection } = useConnection();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check verification status
  const checkVerification = useCallback(async () => {
    if (!mintAddress || !connection || preset !== "honest") {
      return false;
    }

    try {
      setIsChecking(true);
      setError(null);
      
      const mintPubkey = new PublicKey(mintAddress);
      const isHonest = await verifyHonestMint({ connection, mintPubkey });
      
      setIsVerified(isHonest);
      setLastChecked(new Date());
      
      return isHonest;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to verify honest launch";
      setError(errorMessage);
      console.error("Error checking honest launch verification:", err);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [mintAddress, connection, preset]);

  // Auto-check verification on mount and when dependencies change
  useEffect(() => {
    if (autoCheck && mintAddress && connection && preset === "honest") {
      checkVerification();
    }
  }, [autoCheck, mintAddress, connection, preset, checkVerification]);

  // Manual verification check
  const refreshVerification = useCallback(async () => {
    return await checkVerification();
  }, [checkVerification]);

  // Reset verification state
  const resetVerification = useCallback(() => {
    setIsVerified(false);
    setIsChecking(false);
    setLastChecked(null);
    setError(null);
  }, []);

  // Update verification status (useful for parent components)
  const updateVerificationStatus = useCallback((status: boolean) => {
    setIsVerified(status);
    setLastChecked(new Date());
    setError(null);
  }, []);

  return {
    isVerified,
    isChecking,
    lastChecked,
    error,
    checkVerification,
    refreshVerification,
    resetVerification,
    updateVerificationStatus,
  };
};
