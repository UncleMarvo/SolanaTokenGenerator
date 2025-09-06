import { FC, useState } from "react";
import { useHonestLaunchVerification } from "../hooks/useHonestLaunchVerification";
import { useToast } from "../hooks/useToast";
import { IS_DEVNET } from "../lib/env";
import { Spinner } from "./ui/Spinner";

interface HonestLaunchEnforcerProps {
  mintAddress: string;
  preset: "honest" | "degen";
  onVerificationChange?: (isVerified: boolean) => void;
}

const HonestLaunchEnforcer: FC<HonestLaunchEnforcerProps> = ({
  mintAddress,
  preset,
  onVerificationChange,
}) => {
  const { status, isLoading, error, isRetrying, enforceHonestLaunch, clearError } = useHonestLaunchVerification(mintAddress);
  const { showToast } = useToast();
  const [txid, setTxid] = useState<string | null>(null);
  
  // Only show for honest preset
  if (preset !== "honest") {
    return null;
  }

  const handleEnforceHonestLaunch = async () => {
    try {
      const result = await enforceHonestLaunch();
      if (result?.success) {
        setTxid(result.txid);
        onVerificationChange?.(true);
        showToast("Honest Launch enforced successfully!", "success");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to enforce honest launch";
      showToast(errorMessage, "error");
    }
  };

  // If already verified, show success state
  if (status.isVerified) {
    return (
      <div className="flex flex-col items-center space-x-2">
        <div className="bg-success/20 border border-success/30 rounded-lg px-3 py-2">
          <span className="text-success text-sm font-medium flex items-center">
            ✅ On-chain Verified
          </span>
        </div>
        {txid && (
          <a
            href={`https://solscan.io/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-600 text-xs underline"
          >
            View Transaction
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Show loading state during initial verification */}
      {isLoading && !status.isVerified && (
        <div className="bg-muted/20 border border-muted/30 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center space-x-2">
            <Spinner size={12} />
            <span className="text-muted text-sm">
              {isRetrying ? "Waiting for confirmation… (devnet can be slow)" : (IS_DEVNET ? "Verifying… (devnet can be slow)" : "Verifying...")}
            </span>
          </div>
        </div>
      )}
      
      <button
        onClick={handleEnforceHonestLaunch}
        disabled={isLoading}
        className="bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Spinner size={12} />
            <span>
              {IS_DEVNET ? "Waiting for confirmation… (devnet can be slow)" : "Enforcing..."}
            </span>
          </div>
        ) : (
          "Enforce Honest Launch (revoke authorities)"
        )}
      </button>
      
      {error && (
        <div className="text-error text-xs">
          {error}
          <button 
            onClick={clearError}
            className="ml-2 text-error/70 hover:text-error underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="text-muted text-xs">
        This will permanently revoke your ability to mint new tokens or freeze accounts.
      </div>
    </div>
  );
};

export default HonestLaunchEnforcer;
