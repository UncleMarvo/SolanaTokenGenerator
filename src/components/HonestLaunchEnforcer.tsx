import React, { FC, useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { 
  revokeAuthorities, 
  readMintAuthorities
} from "../lib/solanaToken";
import { notify } from "../utils/notifications";
import { ClipLoader } from "react-spinners";
import { useHonestLaunchVerification } from "../hooks/useHonestLaunchVerification";

interface HonestLaunchEnforcerProps {
  mintAddress: string;
  preset: "honest" | "degen";
  className?: string;
  onVerificationChange?: (isVerified: boolean) => void; // Callback to parent component
}

export const HonestLaunchEnforcer: FC<HonestLaunchEnforcerProps> = ({ 
  mintAddress, 
  preset, 
  className = "", 
  onVerificationChange 
}) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  
  const [isEnforcing, setIsEnforcing] = useState(false);
  const [authorities, setAuthorities] = useState<{
    mintAuthority: string | null;
    freezeAuthority: string | null;
  } | null>(null);
  const [showProof, setShowProof] = useState(false);
  const [lastTxids, setLastTxids] = useState<string[]>([]);

  // Use custom hook for verification management
  const {
    isVerified,
    isChecking: verificationLoading,
    updateVerificationStatus,
  } = useHonestLaunchVerification({
    mintAddress,
    preset,
    autoCheck: true,
  });

  // Update parent component when verification status changes
  useEffect(() => {
    if (onVerificationChange) {
      onVerificationChange(isVerified);
    }
  }, [isVerified, onVerificationChange]);

  // Check if the mint is honestly launched and get authorities
  const checkVerificationStatus = async () => {
    if (!mintAddress || !connection) return;
    
    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      if (isVerified) {
        // Get current authorities to display
        const currentAuthorities = await readMintAuthorities({ connection, mintPubkey });
        setAuthorities(currentAuthorities);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      // Don't show error notification for verification checks
    }
  };

  // Enforce honest launch by revoking authorities
  const enforceHonestLaunch = async () => {
    if (!publicKey || !connection || !mintAddress) {
      notify({
        type: "error",
        message: "Please connect your wallet first",
      });
      return;
    }

    try {
      setIsEnforcing(true);
      const mintPubkey = new PublicKey(mintAddress);
      
      // Create wallet adapter object
      const walletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };

      // Revoke authorities
      const { txids } = await revokeAuthorities({
        connection,
        payer: walletAdapter,
        mintPubkey,
      });

      if (txids.length > 0) {
        setLastTxids(txids);
        setShowProof(true);
        
        // Update verification status
        updateVerificationStatus(true);
        
        // Re-check verification status to get authorities
        await checkVerificationStatus();
        
        notify({
          type: "success",
          message: "Honest Launch enforced successfully!",
          description: `${txids.length} authority(ies) revoked. Your token is now community-controlled.`,
          txid: txids[0], // Show first transaction ID
        });
      } else {
        notify({
          type: "info",
          message: "Already enforced",
          description: "This token already has honest launch enforced.",
        });
      }
    } catch (error) {
      console.error("Error enforcing honest launch:", error);
      notify({
        type: "error",
        message: "Failed to enforce honest launch",
        description: error.message,
      });
    } finally {
      setIsEnforcing(false);
    }
  };

  // Only show for honest preset tokens
  if (preset !== "honest") {
    return null;
  }

  // If already verified, show success state
  if (isVerified) {
    return (
      <div className={`bg-success/20 border border-success/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
              <span className="text-success text-lg">✅</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-success font-semibold">On-chain Verified ✅</h3>
            <p className="text-success/80 text-sm">
              This token has honest launch enforced. Mint and freeze authorities are revoked.
            </p>
          </div>
        </div>
        
        {/* Proof section */}
        {authorities && (
          <div className="mt-3 pt-3 border-t border-success/20">
            <button
              onClick={() => setShowProof(!showProof)}
              className="text-success/80 hover:text-success text-sm font-medium"
            >
              {showProof ? "Hide proof" : "View proof"}
            </button>
            
            {showProof && (
              <div className="mt-2 space-y-2 text-xs text-success/70">
                <div>Mint Authority: {authorities.mintAuthority ? "❌ Active" : "✅ Revoked"}</div>
                <div>Freeze Authority: {authorities.freezeAuthority ? "❌ Active" : "✅ Revoked"}</div>
                
                {lastTxids.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium mb-1">Transaction Proof:</div>
                    {lastTxids.map((txid, index) => (
                      <a
                        key={txid}
                        href={`https://solscan.io/tx/${txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-success/80 hover:text-success break-all"
                      >
                        {index + 1}. {txid.slice(0, 8)}...{txid.slice(-8)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show enforcement button for unverified honest tokens
  return (
    <div className={`bg-warning/20 border border-warning/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center">
            <span className="text-warning text-lg">⚠️</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-warning font-semibold">Enforce Honest Launch</h3>
          <p className="text-warning/80 text-sm mb-3">
            Revoke mint and freeze authorities to make this token community-controlled and build trust.
          </p>
          
          <button
            onClick={enforceHonestLaunch}
            disabled={isEnforcing || !publicKey}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isEnforcing || !publicKey
                ? "bg-muted/30 text-muted cursor-not-allowed"
                : "bg-warning hover:bg-warning/80 text-warning-content"
            }`}
          >
            {isEnforcing ? (
              <div className="flex items-center space-x-2">
                <ClipLoader size={16} color="currentColor" />
                <span>Enforcing...</span>
              </div>
            ) : !publicKey ? (
              "Connect Wallet"
            ) : (
              "Revoke Authorities"
            )}
          </button>
          
          {verificationLoading && (
            <div className="mt-2 text-warning/70 text-sm flex items-center space-x-2">
              <ClipLoader size={12} color="currentColor" />
              <span>Checking verification status...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
