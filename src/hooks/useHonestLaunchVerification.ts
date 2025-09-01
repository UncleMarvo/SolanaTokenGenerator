import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { 
  revokeAuthorities, 
  verifyHonestMint, 
  readMintAuthorities 
} from "../lib/solanaToken";

export interface HonestLaunchStatus {
  isVerified: boolean;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  lastChecked: number | null;
}

export const useHonestLaunchVerification = (mintAddress: string | null) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [status, setStatus] = useState<HonestLaunchStatus>({
    isVerified: false,
    mintAuthority: null,
    freezeAuthority: null,
    lastChecked: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify honest launch status from blockchain
  const verifyStatus = useCallback(async () => {
    if (!mintAddress || !connection) return;

    try {
      setError(null);
      const authorities = await readMintAuthorities({ connection, mint: mintAddress });
      const isVerified = !authorities.mintAuthority && !authorities.freezeAuthority;
      
      setStatus({
        isVerified,
        mintAuthority: authorities.mintAuthority,
        freezeAuthority: authorities.freezeAuthority,
        lastChecked: Date.now(),
      });
    } catch (err) {
      console.error("Failed to verify honest launch status:", err);
      setError("Failed to verify on-chain status");
    }
  }, [mintAddress, connection]);

  // Revoke authorities to enforce honest launch
  const enforceHonestLaunch = useCallback(async () => {
    if (!mintAddress || !connection || !wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected or cannot sign transactions");
    }

    setIsLoading(true);
    setError(null);

    try {
      // Revoke authorities
      const result = await revokeAuthorities({
        connection,
        wallet,
        mint: mintAddress,
      });

      // Verify the revocation was successful
      const isVerified = await verifyHonestMint({ connection, mint: mintAddress });
      
      if (isVerified) {
        // Update status to reflect successful revocation
        setStatus(prev => ({
          ...prev,
          isVerified: true,
          mintAuthority: null,
          freezeAuthority: null,
          lastChecked: Date.now(),
        }));
        
        return { success: true, txid: result.txid };
      } else {
        throw new Error("Authorities were not properly revoked");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke authorities";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mintAddress, connection, wallet]);

  // Check status on mount and when dependencies change
  useEffect(() => {
    if (mintAddress && connection) {
      verifyStatus();
    }
  }, [mintAddress, connection, verifyStatus]);

  return {
    status,
    isLoading,
    error,
    verifyStatus,
    enforceHonestLaunch,
    clearError: () => setError(null),
  };
};
